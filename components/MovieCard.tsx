import { icons } from "@/constants/icons";
import { Link } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const MovieCard = ({
  id,
  poster_path,
  title,
  vote_average,
  release_date,
}: Movie) => {
  const posterUrl = poster_path
    ? `https://image.tmdb.org/t/p/w500${poster_path}`
    : "https://placehold.co/600x900/1a1a1a/ffffff.png?text=No+Image";

  const rating = vote_average > 0 ? (vote_average / 2).toFixed(1) : "N/A";

  return (
    <Link href={`/movies/${id}`} asChild>
      <TouchableOpacity className="w-full">
        <Image
          source={{ uri: posterUrl }}
          className="w-full h-52 rounded-lg"
          resizeMode="cover"
        />
        <Text
          className="text-white text-sm font-semibold mt-2"
          numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row items-center justify-start gap-x-1">
          <Image source={icons.star} className="size-4" />
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
