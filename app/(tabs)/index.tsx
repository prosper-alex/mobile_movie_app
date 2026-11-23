import MovieGrid from "@/components/MovieGrid";
import PersonalizedMoviesSection from "@/components/PersonalizedMoviesSection";
import RecoveryMessage from "@/components/RecoveryMessage";
import Screen from "@/components/Screen";
import SearchBar from "@/components/SearchBar";
import TrendingMovieCard from "@/components/TrendingMovieCard";
import { icons } from "@/constants/icons";
import useMovieSearch from "@/hooks/useMovieSearch";
import { getTrendingMovies } from "@/services/appwrite";
import useFetch from "@/services/useFetch";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";

const HomeScreen = () => {
  const { query, setQuery, movies, loading, error, refetch } = useMovieSearch({
    emptyQueryBehavior: "fetch",
    debounceMs: 500,
  });

  const {
    data: trendingMovies,
    loading: trendingLoading,
    error: trendingError,
    refetch: retryTrending,
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
                accessibilityLabel="Search movies"
                accessibilityHint="Enter a movie title to find matching movies."
                value={query}
                onChangeText={setQuery}
              />
            </View>
            {!query.trim() && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text accessibilityRole="header" className="text-lg text-white font-bold">
                    Trending Searches
                  </Text>
                </View>
                {trendingLoading && (
                  <View className="gap-y-2">
                    <ActivityIndicator size="small" color="#AB8BFF" />
                    <Text className="text-light-200">Loading trending searches...</Text>
                  </View>
                )}
                {trendingError && (
                  <RecoveryMessage message={trendingError.message} onRetry={() => void retryTrending()} />
                )}
                {!trendingLoading &&
                  !trendingError &&
                  uniqueTrending.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}>
                      {uniqueTrending.map((movie, index) => (
                        <TrendingMovieCard
                          key={movie.movie_id}
                          movie={movie}
                          rank={index + 1}
                        />
                      ))}
                    </ScrollView>
                  )}
                {!trendingLoading &&
                  !trendingError &&
                  uniqueTrending.length === 0 && (
                    <Text className="text-light-300">
                      No trending searches yet.
                    </Text>
                  )}
              </View>
            )}
            {!query.trim() ? <PersonalizedMoviesSection /> : null}
            {loading && (
              <ActivityIndicator
                size="large"
                color="#AB8BFF"
                className="my-3"
              />
            )}
            {error && (
              <RecoveryMessage message={error.message} onRetry={() => void refetch()} />
            )}
            {!loading && !error && (
              <Text accessibilityRole="header" className={`text-xl text-white font-bold ${movies?.length ? "mb-4" : ""}`}>
                {query.trim() ? (
                  <>
                    Search results for{" "}
                    <Text className="text-accent">{query}</Text>
                  </>
                ) : (
                  "Popular movies"
                )}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="mt-10">
              <Text className="text-light-200 text-center">{query.trim() ? "No movies found" : "No popular movies are available right now."}</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
};

export default HomeScreen;
