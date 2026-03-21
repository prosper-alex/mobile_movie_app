import React from "react";
import { Text, TouchableOpacity } from "react-native";

type Variant = "primary" | "secondary" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
};

const stylesByVariant: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: "bg-accent",
    text: "text-secondary",
  },
  secondary: {
    container: "bg-dark-100 border border-dark-100",
    text: "text-white",
  },
  danger: {
    container: "bg-red-600",
    text: "text-white",
  },
};

export default function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
}: Props) {
  const styles = stylesByVariant[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={[
        "rounded-full px-5 py-3 items-center justify-center",
        styles.container,
        disabled ? "opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}>
      <Text className={["text-base font-semibold", styles.text].join(" ")}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

