import { Stack } from "expo-router";
import "react-native-url-polyfill/auto";
import "./globals.css";

import { SavedMoviesProvider } from "@/providers/SavedMoviesProvider";

export default function RootLayout() {
  return (
    <SavedMoviesProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="movies/[id]" options={{ headerShown: false }} />
      </Stack>
    </SavedMoviesProvider>
  );
}
