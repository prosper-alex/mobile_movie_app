import React, { useMemo } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Link } from "expo-router";
import PosterImage from "@/components/PosterImage";

type Props = {
  movie: TrendingMovie;
  rank: number;
};

export default function TrendingMovieCard({ movie, rank }: Props) {
  const { width: windowWidth } = useWindowDimensions();

  const cardWidth = useMemo(() => {
    const target = windowWidth * 0.32;
    return Math.max(120, Math.min(168, Math.round(target)));
  }, [windowWidth]);

  const posterHeight = Math.round(cardWidth * 1.38);
  const posterUrl =
    movie.poster_url?.trim().length > 0
      ? movie.poster_url
      : null;

  return (
    <Link href={`/movies/${movie.movie_id}`} asChild>
      <Pressable
        className="mr-4 rounded-2xl overflow-hidden bg-dark-100 border border-dark-100 hover:opacity-90 active:opacity-80"
        accessible
        accessibilityRole="link"
        accessibilityLabel={`Rank ${rank}: ${movie.title}. Trending search: ${movie.search_term}.`}
        accessibilityHint="Opens movie details."
      >
        <View style={{ width: cardWidth }}>
          <View className="relative">
            <PosterImage
              uri={posterUrl}
              style={{ width: cardWidth, height: posterHeight }}
              className="rounded-2xl"
            />
            <View className="absolute top-2 left-2 bg-accent rounded-full px-2 py-1">
              <Text className="text-secondary font-extrabold text-xs">
                #{rank}
              </Text>
            </View>
          </View>

          <View className="px-2 pb-3 pt-2">
            <Text className="text-white text-xs font-semibold" numberOfLines={1}>
              {movie.title}
            </Text>
            <Text className="text-light-300 text-[11px]" numberOfLines={1}>
              {movie.search_term}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

