import React from "react";
import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "@/constants/images";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Screen({ children, className }: Props) {
  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="flex-1 absolute w-full h-full z-0"
        resizeMode="cover"
      />
      <SafeAreaView
        className={["flex-1", className].filter(Boolean).join(" ")}
        edges={["top", "bottom"]}>
        {children}
      </SafeAreaView>
    </View>
  );
}
