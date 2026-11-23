import { icons } from "@/constants/icons";
import React from "react";
import { Image, TextInput, View } from "react-native";

interface Props {
  placeholder: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onFocus?: () => void;
  value: string;
  onChangeText: (text: string) => void;
}

const SearchBar = ({
  placeholder,
  accessibilityLabel,
  accessibilityHint,
  onFocus,
  value,
  onChangeText,
}: Props) => {
  return (
    <View className=" flex-row items-center bg-dark-200 rounded-full px-5 py-2">
      <Image
        source={icons.search}
        className="size-5"
        resizeMode="contain"
        style={{ tintColor: "#ab8bff" }}
        accessible={false}
      />
      <TextInput
        onFocus={onFocus}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={{ minHeight: 48 }}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#a8b5db"
        className="flex-1 ml-3  text-white"
      />
    </View>
  );
};

export default SearchBar;
