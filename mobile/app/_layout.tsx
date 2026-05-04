import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Platform, TouchableOpacity, Text } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { NativeWindStyleSheet } from 'nativewind';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import Constants from 'expo-constants';
import { trpc } from '../utils/trpc';
import { getStorageItem } from '../utils/storage';
import { SocketProvider } from '../context/SocketContext';
import { NotificationManager } from '../components/NotificationManager';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { getBaseUrl } from '../utils/api';

NativeWindStyleSheet.setOutput({
  default: "native",
});

WebBrowser.maybeCompleteAuthSession();

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.innerHTML = `
    body, html { padding: 0 !important; margin: 0 !important; width: 100%; height: 100%; overflow-x: hidden !important; }
    #root, div[data-reactroot] { width: 100% !important; flex: 1; display: flex; }
  `;
  document.head.appendChild(style);

  // Polyfill for legacy TextInputState currentlyFocusedInput on web
  try {
    const { TextInput } = require('react-native');
    if (TextInput.State && typeof TextInput.State.currentlyFocusedInput !== 'function') {
       TextInput.State.currentlyFocusedInput = () => {
         try {
           return TextInput.State.currentlyFocusedField();
         } catch (e) {
           return null;
         }
       };
    }
  } catch (e) { /* ignore */ }
}


// Keep the splash screen visible while we fetch resources

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Expo Router Global Error Boundary
// Catches hard React tree crashes and shows a recovery screen instead of a white/red crash
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f6f5f3' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 28 }}>
        {error.message}
      </Text>
      <TouchableOpacity
        onPress={retry}
        style={{ backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          // Don't retry on authentication errors
          if (error?.data?.httpStatus === 401 || error?.message?.includes('UNAUTHORIZED')) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getBaseUrl(),
          async headers() {
            const token = await getStorageItem('accessToken');
            return {
              Authorization: token ? `Bearer ${token}` : undefined,
            };
          },
        }),
      ],
    })
  );

  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient as any}>
        <QueryClientProvider client={queryClient as any}>
          <BottomSheetModalProvider>
            <SocketProvider>
              <NotificationManager />
              <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <Stack screenOptions={{ headerShown: false }} />
              </View>
            </SocketProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
