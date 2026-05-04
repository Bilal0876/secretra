import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { AuthService } from './services/auth.service';
import { GroupMemberStatus } from '@prisma/client';

import prisma from './shared/prisma';
let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Adjust as needed for production
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      const payload = AuthService.verifyToken(token);
      if (payload) {
        (socket as any).userId = payload.userId;
        return next();
      }
    }
    next(new Error('Authentication error'));
  });

  io.on('connection', async (socket) => {
    const userId = (socket as any).userId;
    console.log(` User connected to socket: ${userId} (${socket.id})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join rooms for all groups the user belongs to
    try {
      const userGroups = await prisma.groupMember.findMany({
        where: { userId, status: GroupMemberStatus.accepted },
        select: { groupId: true },
      });

      userGroups.forEach((g) => {
        socket.join(`group:${g.groupId}`);
        console.log(` Joined group room: group:${g.groupId}`);
      });
    } catch (err) {
      console.error('Error joining group rooms:', err);
    }

    socket.on('disconnect', () => {
      console.log(` User disconnected from socket: ${userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Broadcasts a signal to an entity (user or group) to invalidate their local cache.
 * We send to individual user rooms to ensure delivery even if socket sessions 
 * haven't joined group-specific rooms yet (e.g. after newly joining/creating a group).
 */
export const emitSignal = async (target: { userId?: string; groupId?: string }, event: string, data: any = {}) => {
  if (!io) return;

  if (target.userId) {
    io.to(`user:${target.userId}`).emit(event, data);
  }

  if (target.groupId) {
    // Also emit to the group room for anyone already in it
    io.to(`group:${target.groupId}`).emit(event, data);

    // CRITICAL: Fetch all members and emit to their personal rooms as well.
    // This solves the issue where connected users haven't joined the group room yet.
    try {
      const members = await prisma.groupMember.findMany({
        where: { groupId: target.groupId, status: GroupMemberStatus.accepted },
        select: { userId: true },
      });

      members.forEach((member) => {
        if (member.userId) {
          io.to(`user:${member.userId}`).emit(event, data);
        }
      });
    } catch (err) {
      console.error('Error in multi-user signal broadcast:', err);
    }
  }
};
