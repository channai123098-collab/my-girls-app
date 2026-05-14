import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#075E54' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="ai-girls" options={{ headerShown: false }} />
            <Stack.Screen name="keys" options={{ headerShown: false }} />
            <Stack.Screen name="chat" options={{ title: 'Chat' }} />
            <Stack.Screen name="group-chat" options={{ title: 'Group Chat' }} />
            <Stack.Screen name="face-swap" options={{ title: 'Face Swap' }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="edit-character" options={{ title: 'Edit Character' }} />
            <Stack.Screen name="cloud-storage" options={{ headerShown: false }} />
            <Stack.Screen name="offline-chat" options={{ title: 'Offline AI' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
