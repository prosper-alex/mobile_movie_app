import MovieGrid from "@/components/MovieGrid";
import Screen from "@/components/Screen";
import SearchBar from "@/components/SearchBar";
import TrendingMovieCard from "@/components/TrendingMovieCard";
import { icons } from "@/constants/icons";
import { getTrendingMovies } from "@/services/appwrite";
import useMovieSearch from "@/hooks/useMovieSearch";
import useFetch from "@/services/useFetch";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";

const HomeScreen = () => {
  const { query, setQuery, movies, loading, error } = useMovieSearch({
    emptyQueryBehavior: "fetch",
    debounceMs: 500,
  });

  const {
    data: trendingMovies,
    loading: trendingLoading,
    error: trendingError,
  } = useFetch(getTrendingMovies);
  const trending = useMemo(() => trendingMovies ?? [], [trendingMovies]);

  const uniqueTrending = useMemo(() => {
    const seen = new Set<number>();
    const result: TrendingMovie[] = [];

    for (const item of trending) {
      if (
        !item ||
        typeof item.movie_id !== "number" ||
        typeof item.poster_url !== "string" ||
        typeof item.title !== "string" ||
        typeof item.search_term !== "string"
      ) {
        continue;
      }

      if (seen.has(item.movie_id)) continue;
      seen.add(item.movie_id);
      result.push(item);
    }

    return result;
  }, [trending]);

  return (
    <Screen className="px-5">
      <MovieGrid
        data={movies}
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
            {!query.trim() && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg text-white font-bold">
                    Trending Searches
                  </Text>
                </View>
                {trendingLoading && (
                  <ActivityIndicator size="small" color="#0000ff" />
                )}
                {trendingError && (
                  <Text className="text-red-500">
                    Error: {trendingError.message}
                  </Text>
                )}
                {!trendingLoading && !trendingError && uniqueTrending.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {uniqueTrending.map((movie, index) => (
                      <TrendingMovieCard
                        key={movie.movie_id}
                        movie={movie}
                        rank={index + 1}
                      />
                    ))}
                  </ScrollView>
                )}
                {!trendingLoading && !trendingError && uniqueTrending.length === 0 && (
                  <Text className="text-light-300">
                    No trending searches yet.
                  </Text>
                )}
              </View>
            )}
            {loading && (
              <ActivityIndicator size="large" color="#0000ff" className="my-3" />
            )}
            {error && (
              <Text className="text-red-500 my-3">Error: {error.message}</Text>
            )}
            {!loading && !error && (
              <Text className="text-xl text-white font-bold">
                {query.trim() ? (
                  <>
                    Search results for <Text className="text-accent">{query}</Text>
                  </>
                ) : (
                  "Popular movies"
                )}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !error && query.trim() ? (
            <View className="mt-10">
              <Text className="text-gray-500 text-center">No movies found</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
};

export default HomeScreen;
