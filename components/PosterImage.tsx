import React, { useState } from "react";
import { Image, Text, View, type ImageStyle, type ViewStyle } from "react-native";

type Props = {
  uri: string | null | undefined;
  className: string;
  style: ViewStyle;
};

export default function PosterImage({ uri, className, style }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return (
      <View
        accessible={false}
        className={[className, "bg-dark-100 items-center justify-center px-2"].join(" ")}
        style={style}
      >
        <Text className="text-light-300 text-xs text-center" numberOfLines={2}>
          Poster unavailable
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as ImageStyle}
      className={className}
      resizeMode="cover"
      accessible={false}
      onError={() => setFailedUri(uri)}
    />
  );
}
