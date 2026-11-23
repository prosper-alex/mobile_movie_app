import { icons } from "@/constants/icons";
import PosterImage from "@/components/PosterImage";
import type { MovieSummary } from "@/types/movies";
import { Link } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type Props = MovieSummary & {
  onPress?: () => void;
};

const MovieCard = ({
  id,
  poster_path,
  title,
  vote_average,
  release_date,
  onPress,
}: Props) => {
  const posterUrl = poster_path
    ? `https://image.tmdb.org/t/p/w500${poster_path}`
    : null;

  const rating = vote_average > 0 ? (vote_average / 2).toFixed(1) : "N/A";
  const year = release_date?.split("-")[0];
  const accessibilityLabel = [
    title,
    rating === "N/A" ? null : `Rating ${rating} out of 5`,
    year ? `Year ${year}` : null,
  ].filter(Boolean).join(", ");

  return (
    <Link href={`/movies/${id}`} asChild>
      <TouchableOpacity
        className="w-full"
        onPress={onPress}
        accessible
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens movie details."
      >
        <PosterImage
          uri={posterUrl}
          style={{ width: "100%", aspectRatio: 2 / 3 }}
          className="rounded-lg"
        />
        <Text
          className="text-white text-sm font-semibold mt-2"
          numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row items-center justify-start gap-x-1">
          <Image source={icons.star} className="size-4" accessible={false} />
          <Text className="text-xs text-white font-bold">{rating}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-light-300">
            {release_date?.split("-")[0]}
          </Text>
          {/* <Text className="text-xs font-medium text-light-300 uppercase">
            {" "}
            Movie
          </Text> */}
        </View>
      </TouchableOpacity>
    </Link>
  );
};

export default MovieCard;
