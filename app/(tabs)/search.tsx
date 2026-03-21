import MovieGrid from "@/components/MovieGrid";
import Screen from "@/components/Screen";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { updateSearchCount } from "@/services/appwrite";
import useMovieSearch from "@/hooks/useMovieSearch";
import type { MovieSummary } from "@/types/movies";
import React, { useCallback } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

const SearchScreen = () => {
  const { query, setQuery, movies, loading, error } = useMovieSearch({
    emptyQueryBehavior: "reset",
    debounceMs: 500,
  });

  const trackMovieClick = useCallback(
    (movie: MovieSummary) => {
      if (!query.trim()) return;
      void updateSearchCount(query, movie).catch((err) => {
        console.log("Search tracking failed:", err);
      });
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
                value={query}
                onChangeText={setQuery}
              />
            </View>
            {loading && (
              <ActivityIndicator size="large" color="#0000ff" className="my-3" />
            )}
            {error && (
              <Text className="text-red-500 my-3">Error: {error.message}</Text>
            )}
            {!loading && !error && query.trim() && (movies?.length ?? 0) > 0 && (
              <Text className="text-xl text-white font-bold">
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
