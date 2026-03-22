import Screen from "@/components/Screen";
import { icons } from "@/constants/icons";
import React from "react";
import { Image, Text, View } from "react-native";

export default function Onboarding() {
  return (
    <Screen className="px-5">
      <View className="w-full flex-row justify-center mt-6">
        <Image
          source={icons.logo}
          className="w-12 h-10 mb-5"
          resizeMode="contain"
        />
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-extrabold text-white mb-2">
          MovieFlix
        </Text>
        <Text className="text-light-200 text-center">
          Discover popular movies, search titles, and save your favorites.
        </Text>
      </View>
    </Screen>
  );
}
