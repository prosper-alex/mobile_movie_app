import Screen from "@/components/Screen";
import { getHasSeenOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { state } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await getHasSeenOnboarding();
      if (cancelled) return;
      setHasSeenOnboardingState(seen);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading" || hasSeenOnboarding === null) {
    return (
      <Screen className="px-5">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </Screen>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (state.status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
