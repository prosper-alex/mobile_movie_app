import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";

type Props = {
  url: string;
  title?: string;
};

export default function GitHubButton({ url, title = "View on GitHub" }: Props) {
  const displayUrl = url.startsWith("https://")
    ? url.slice("https://".length)
    : url.startsWith("http://")
      ? url.slice("http://".length)
      : url;

  const handlePress = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return;
      await Linking.openURL(url);
    } catch (err) {
      console.log("Failed to open GitHub URL:", err);
    }
  }, [url]);

  return (
    <TouchableOpacity
      onPress={() => void handlePress()}
      accessible
      accessibilityRole="link"
      accessibilityLabel={`${title}, ${displayUrl}`}
      accessibilityHint="Opens the project link in your browser."
      activeOpacity={0.85}
      className="bg-dark-100 border border-dark-100 rounded-2xl p-4 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 rounded-full bg-dark-200 items-center justify-center mr-3">
          <FontAwesome name="github" size={20} color="#FFFFFF" accessible={false} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-light-200 text-xs mt-1" numberOfLines={1}>
            {displayUrl}
          </Text>
        </View>
      </View>
      <FontAwesome name="external-link" size={16} color="#A8B5DB" accessible={false} />
    </TouchableOpacity>
  );
}
