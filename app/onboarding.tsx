import Button from "@/components/Button";
import RecoveryMessage from "@/components/RecoveryMessage";
import Screen from "@/components/Screen";
import { icons } from "@/constants/icons";
import { completeMovieOnboarding } from "@/lib/preferences";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter, type Href } from "expo-router";
import React, { useRef, useState } from "react";
import { Image, Text, View } from "react-native";

export default function Onboarding() {
  const router = useRouter();
  const { state, login } = useAuth();
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueAsGuest = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    let saved = false;
    try {
      // Omitted genres deliberately preserve any preferences already on disk.
      await completeMovieOnboarding();
      saved = true;
      if (state.status !== "authenticated") await login({ name: "Guest" });
      router.replace("/(tabs)");
    } catch {
      setError(saved
        ? "Your preferences are saved, but MovieFlix couldn't open. Try again."
        : "Couldn't save your preferences. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Screen className="px-5">
      <View className="w-full flex-row justify-center mt-6">
        <Image source={icons.logo} className="w-12 h-10 mb-5" resizeMode="contain" />
      </View>

      <View className="flex-1 justify-center">
        <Text accessibilityRole="header" className="text-3xl font-extrabold text-white text-center mb-3">MovieFlix</Text>
        <Text className="text-light-200 text-center mb-8">
          Discover popular movies, search titles, and save your favorites.
        </Text>
        <View className="bg-dark-100/60 border border-dark-100 rounded-2xl p-5">
          <View className="flex-row items-center mb-4">
            <Image source={icons.search} className="w-5 h-5 mr-3" />
            <Text className="text-white text-base font-semibold">Search instantly</Text>
          </View>
          <View className="flex-row items-center mb-4">
            <Image source={icons.star} className="w-5 h-5 mr-3" />
            <Text className="text-white text-base font-semibold">See what’s trending</Text>
          </View>
          <View className="flex-row items-center">
            <Image source={icons.save} className="w-5 h-5 mr-3" />
            <Text className="text-white text-base font-semibold">Save your picks</Text>
          </View>
        </View>
      </View>

      <View className="pb-6">
        {error ? <RecoveryMessage message={error} /> : null}
        <Button
          title="Choose movie genres"
          disabled={submitting}
          onPress={() => router.push("/genre-preferences" as Href)}
        />
        <View className="mt-3">
          <Button
            title={submitting ? "Saving..." : "Explore without preferences"}
            variant="secondary"
            disabled={submitting}
            onPress={() => void continueAsGuest()}
          />
        </View>
      </View>
    </Screen>
  );
}
