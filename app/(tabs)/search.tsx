import MovieGrid from "@/components/MovieGrid";
import RecoveryMessage from "@/components/RecoveryMessage";
import Screen from "@/components/Screen";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { updateSearchCount } from "@/services/appwrite";
import useMovieSearch from "@/hooks/useMovieSearch";
import type { MovieSummary } from "@/types/movies";
import React, { useCallback } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

const SearchScreen = () => {
  const { query, setQuery, movies, loading, error, refetch } = useMovieSearch({
    emptyQueryBehavior: "reset",
    debounceMs: 500,
  });

  const trackMovieClick = useCallback(
    (movie: MovieSummary) => {
      if (!query.trim()) return;
      // Optional analytics must not block navigation or log backend responses.
      void updateSearchCount(query, movie).catch(() => undefined);
    },
    [query],
  );

  return (
    <Screen className="px-5">
      <MovieGrid
        data={movies}
        onItemPress={trackMovieClick}
        ListHeaderComponent={
          <>
            <View className="w-full flex-row justify-center mt-6">
              <Image
                source={icons.logo}
                className="w-12 h-10 mb-5"
                resizeMode="contain"
              />
            </View>
            <View className="my-5">
              <SearchBar
                placeholder="Search movies..."
                accessibilityLabel="Search movies"
                accessibilityHint="Enter a movie title to find matching movies."
                value={query}
                onChangeText={setQuery}
              />
            </View>
            {loading && (
              <ActivityIndicator size="large" color="#AB8BFF" className="my-3" />
            )}
            {error && (
              <RecoveryMessage message={error.message} onRetry={() => void refetch()} />
            )}
            {!loading && !error && query.trim() && (movies?.length ?? 0) > 0 && (
              <Text accessibilityRole="header" className="text-xl text-white font-bold mb-4">
                Search results for <Text className="text-accent">{query}</Text>
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="mt-10">
              <Text className="text-gray-500 text-center">
                {query.trim() ? "No movies found" : "Search for a movie"}
              </Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
};

export default SearchScreen;
