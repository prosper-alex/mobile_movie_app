import Button from "@/components/Button";
import GitHubButton from "@/components/GitHubButton";
import Screen from "@/components/Screen";
import RecoveryMessage from "@/components/RecoveryMessage";
import { icons } from "@/constants/icons";
import client, { isAppwriteConfigured } from "@/lib/appwrite";
import { useAuth } from "@/providers/AuthProvider";
import { useSavedMovies } from "@/providers/SavedMoviesProvider";
import { useRouter, type Href } from "expo-router";
import React, { useCallback } from "react";
import { Image, ScrollView, Text, View } from "react-native";

const tmdbConfigured = Boolean(process.env.EXPO_PUBLIC_MOVIE_API_KEY);
const githubUrl =
  process.env.EXPO_PUBLIC_GITHUB_URL ?? "https://github.com/Prosper-Alex";

const ProfileScreen = () => {
  const router = useRouter();
  const { saved, clear, hydrated, pending, error, retry } = useSavedMovies();
  const { state, logout } = useAuth();
  const userLabel =
    state.status === "authenticated"
      ? state.user.name || state.user.email || "User"
      : "Guest";

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/(auth)/login");
  }, [logout, router]);

  return (
    <Screen className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 92 }}>
      <View className="w-full flex-row justify-center mt-6">
        <Image
          source={icons.logo}
          className="w-12 h-10 mb-5"
          resizeMode="contain"
        />
      </View>

      <Text accessibilityRole="header" className="text-xl text-white font-bold mb-2">Profile</Text>
      <Text className="text-light-200 mb-2">
        Signed in as:{" "}
        <Text className="text-white font-semibold">{userLabel}</Text>
      </Text>
      <Text className="text-light-200 mb-6">
        Saved movies:{" "}
        <Text className="text-white font-semibold">{saved.length}</Text>
      </Text>

      <View className="mb-6">
        <Button
          title="Edit movie preferences"
          variant="secondary"
          onPress={() => router.push({ pathname: "/genre-preferences", params: { mode: "edit" } } as unknown as Href)}
        />
      </View>

      <View className="bg-dark-100 rounded-2xl p-4 mb-6">
        <Text accessibilityRole="header" className="text-white font-semibold mb-2">Configuration</Text>
        <Text className="text-light-200">
          TMDB API:{" "}
          <Text
            className={tmdbConfigured ? "text-green-400" : "text-yellow-400"}>
            {tmdbConfigured
              ? "Configured"
              : "Missing EXPO_PUBLIC_MOVIE_API_KEY"}
          </Text>
        </Text>
        <Text className="text-light-200 mt-1">
          Appwrite:{" "}
          <Text
            className={
              isAppwriteConfigured && client
                ? "text-green-400"
                : "text-yellow-400"
            }>
            {isAppwriteConfigured && client
              ? "Configured"
              : "Optional (missing endpoint/project)"}
          </Text>
        </Text>
      </View>

      <View className="mb-6">
        <GitHubButton url={githubUrl} title="Project GitHub" />
      </View>

      <View className="gap-y-3 mt-auto pb-6">
        {error ? <RecoveryMessage message={error.message} busy={pending} onRetry={() => void retry()} /> : null}
        <Button
          title={pending ? "Updating saved movies..." : "Clear saved movies"}
          variant="danger"
          disabled={!hydrated || pending}
          onPress={() => void clear()}
        />
        <Button
          title="Sign out"
          variant="secondary"
          onPress={() => void handleLogout()}
        />
      </View>
      </ScrollView>
    </Screen>
  );
};

export default ProfileScreen;
