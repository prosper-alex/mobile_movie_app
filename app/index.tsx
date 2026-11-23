import Screen from "@/components/Screen";
import RecoveryMessage from "@/components/RecoveryMessage";
import { getHasSeenOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { state, initializationError, retryInitialization } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [onboardingError, setOnboardingError] = useState<Error | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setOnboardingError(null);
    (async () => {
      try {
        const seen = await getHasSeenOnboarding();
        if (!cancelled) setHasSeenOnboardingState(seen);
      } catch {
        if (!cancelled) setOnboardingError(new Error("Couldn't load your startup settings. Please try again."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (initializationError || onboardingError) {
    return (
      <Screen className="px-5">
        <View className="flex-1 justify-center">
          <RecoveryMessage
            message={(initializationError ?? onboardingError)!.message}
            onRetry={() => {
              setOnboardingError(null);
              setHasSeenOnboardingState(null);
              setAttempt((value) => value + 1);
              void retryInitialization();
            }}
          />
        </View>
      </Screen>
    );
  }

  if (state.status === "loading" || hasSeenOnboarding === null) {
    return (
      <Screen className="px-5">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#AB8BFF" />
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
