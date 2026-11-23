import React from "react";
import { Text, View } from "react-native";
import Button from "@/components/Button";

type Props = {
  message: string;
  onRetry?: () => void;
  busy?: boolean;
};

export default function RecoveryMessage({ message, onRetry, busy }: Props) {
  return (
    <View className="my-3 gap-y-3">
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="text-light-200">
        {message}
      </Text>
      {onRetry ? <Button title={busy ? "Trying again..." : "Try again"} variant="secondary" disabled={busy} onPress={onRetry} /> : null}
    </View>
  );
}
