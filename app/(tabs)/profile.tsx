import Button from "@/components/Button";
import Screen from "@/components/Screen";
import { icons } from "@/constants/icons";
import client, { isAppwriteConfigured } from "@/lib/appwrite";
import { useSavedMovies } from "@/providers/SavedMoviesProvider";
import React from "react";
import { Image, Text, View } from "react-native";

const tmdbConfigured = Boolean(process.env.EXPO_PUBLIC_MOVIE_API_KEY);

const ProfileScreen = () => {
  const { saved, clear } = useSavedMovies();

  return (
    <Screen className="px-5">
      <View className="w-full flex-row justify-center mt-6">
        <Image
          source={icons.logo}
          className="w-12 h-10 mb-5"
          resizeMode="contain"
        />
      </View>

      <Text className="text-xl text-white font-bold mb-2">Profile</Text>
      <Text className="text-light-200 mb-6">
        Saved movies: <Text className="text-white font-semibold">{saved.length}</Text>
      </Text>

      <View className="bg-dark-100 rounded-2xl p-4 mb-6">
        <Text className="text-white font-semibold mb-2">Configuration</Text>
        <Text className="text-light-200">
          TMDB API:{" "}
          <Text className={tmdbConfigured ? "text-green-400" : "text-yellow-400"}>
            {tmdbConfigured ? "Configured" : "Missing EXPO_PUBLIC_MOVIE_API_KEY"}
          </Text>
        </Text>
        <Text className="text-light-200 mt-1">
          Appwrite:{" "}
          <Text
            className={isAppwriteConfigured && client ? "text-green-400" : "text-yellow-400"}>
            {isAppwriteConfigured && client
              ? "Configured"
              : "Optional (missing endpoint/project)"}
          </Text>
        </Text>
      </View>

      <Button title="Clear saved movies" variant="danger" onPress={() => void clear()} />
    </Screen>
  );
};

export default ProfileScreen;
