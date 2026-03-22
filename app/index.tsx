import Screen from "@/components/Screen";
import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <Screen className="px-5">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </Screen>
    );
  }

  if (state.status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

