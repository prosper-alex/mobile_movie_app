import Button from "@/components/Button";
import Screen from "@/components/Screen";
import { icons } from "@/constants/icons";
import { setHasSeenOnboarding } from "@/lib/onboarding";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image, Text, View } from "react-native";

export default function Onboarding() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleGetStarted = useCallback(async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await setHasSeenOnboarding();
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  }, [router, submitting]);

  return (
    <Screen className="px-5">
      <View className="w-full flex-row justify-center mt-6">
        <Image
          source={icons.logo}
          className="w-12 h-10 mb-5"
          resizeMode="contain"
        />
      </View>

      <View className="flex-1 justify-center">
        <Text className="text-3xl font-extrabold text-white text-center mb-3">
          MovieFlix
        </Text>
        <Text className="text-light-200 text-center mb-8">
          Discover popular movies, search titles, and save your favorites.
        </Text>

        <View className="bg-dark-100/60 border border-dark-100 rounded-2xl p-5">
          <View className="flex-row items-center mb-4">
            <Image source={icons.search} className="w-5 h-5 mr-3" />
            <Text className="text-white text-base font-semibold">
              Search instantly
            </Text>
          </View>
          <View className="flex-row items-center mb-4">
            <Image source={icons.star} className="w-5 h-5 mr-3" />
            <Text className="text-white text-base font-semibold">
              See what’s trending
            </Text>
          </View>
          <View className="flex-row items-center">
            <Image source={icons.save} className="w-5 h-5 mr-3" />
            <Text className="text-white text-base font-semibold">
              Save your picks
            </Text>
          </View>
        </View>
      </View>

      <View className="pb-6 ">
        <Button
          title={submitting ? "Loading..." : "Get Started"}
          onPress={handleGetStarted}
          disabled={submitting}
        />
      </View>
    </Screen>
  );
}
