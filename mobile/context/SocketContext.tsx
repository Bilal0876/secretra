import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getStorageItem } from '../utils/storage';
import { trpc } from '../utils/trpc';
import { getBaseUrl } from '../utils/api';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const utils = trpc.useUtils();

  const getSocketUrl = () => {
    // Rely on the universal API base URL logic so production environment variables are respected.
    const apiUrl = getBaseUrl();
    if (apiUrl) {
       return apiUrl.replace(/\/trpc\/?$/, ''); // Strip /trpc from the end
    }

    const localhost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    const debuggerHost = Constants.expoConfig?.hostUri;
    const address = debuggerHost?.split(':')[0];

    if (!address) return `http://${localhost}:4000`;
    return `http://${address}:4000`;
  };

  useEffect(() => {
    let isMounted = true;

    const setupSocket = async () => {
      const token = await getStorageItem('accessToken');
      if (!token || !isMounted) return;

      // Avoid duplicate connections
      if (socketRef.current?.connected) return;

      const socket = io(getSocketUrl(), {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('Socket connected');
      });

      // ── Real-Time Signal Handlers ──────────────────────────────────────────

      socket.on('calendar_update', () => {
        console.log('Signal: Invalidating calendar events & logs...');
        utils.calendar.getEvents.invalidate();
        utils.calendar.getDashboardOverview.invalidate();
        utils.calendar.getRecentActivity.invalidate();
      });

      socket.on('calendarSyncComplete', (data) => {
        console.log(`Signal: Google Sync Complete (${data?.count || 0} items)`);
        utils.calendar.getEvents.invalidate();
        utils.calendar.getDashboardOverview.invalidate();
      });

      socket.on('new_invite', () => {
        console.log('Signal: New department invite!');
        utils.group.getInvites.invalidate();
      });

      socket.on('group_update', () => {
        console.log(' Signal: Group membership change...');
        utils.group.getGroups.invalidate();
        utils.group.getGroup.invalidate();
        utils.group.getInvites.invalidate();
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });

      socketRef.current = socket;
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        console.log(' Cleaning up socket connection...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [utils]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
