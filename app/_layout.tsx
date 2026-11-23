import { Stack } from "expo-router";
import "react-native-url-polyfill/auto";
import "./globals.css";

import { AuthProvider } from "@/providers/AuthProvider";
import { SavedMoviesProvider } from "@/providers/SavedMoviesProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SavedMoviesProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="movies/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="genre-preferences" options={{ headerShown: false }} />
        </Stack>
      </SavedMoviesProvider>
    </AuthProvider>
  );
}
