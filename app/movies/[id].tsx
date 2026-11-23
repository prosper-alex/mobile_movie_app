import Button from "@/components/Button";
import Screen from "@/components/Screen";
import RecoveryMessage from "@/components/RecoveryMessage";
import PosterImage from "@/components/PosterImage";
import { icons } from "@/constants/icons";
import { fetchMovieDetails } from "@/services/api";
import useFetch from "@/services/useFetch";
import type { MovieSummary } from "@/types/movies";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSavedMovies } from "@/providers/SavedMoviesProvider";

const MovieDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const movieId = Number(params.id);

  const fetcher = useCallback((signal?: AbortSignal) => {
    return fetchMovieDetails(movieId, signal);
  }, [movieId]);
  const { data: movie, loading, error, refetch } = useFetch(fetcher);

  const { isSaved, toggle, hydrated, pending, error: savedError, retry } = useSavedMovies();

  const summary = useMemo<MovieSummary | null>(() => {
    if (!movie) return null;
    return {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
    };
  }, [movie]);

  const saved = Number.isFinite(movieId) ? isSaved(movieId) : false;

  return (
    <Screen className="px-5">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between mt-2 mb-4">
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen or Home."
          style={{ width: 48, height: 48 }}
          className="w-12 h-12 rounded-full bg-dark-100 items-center justify-center">
          <Image
            source={icons.arrow}
            className="size-5"
            style={{ tintColor: "#ffffff" }}
            resizeMode="contain"
            accessible={false}
          />
        </TouchableOpacity>
        <Text accessibilityRole="header" className="text-white font-semibold text-base">Details</Text>
        <View className="w-12 h-12" />
      </View>

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#AB8BFF" />
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center">
          <RecoveryMessage message={error.message} onRetry={() => void refetch()} />
        </View>
      )}

      {!loading && !error && movie && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="flex-row">
            <PosterImage
              uri={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null}
              style={{ width: 128, height: 192 }}
              className="rounded-xl"
            />
            <View className="flex-1 ml-4">
              <Text accessibilityRole="header" className="text-white text-xl font-bold" numberOfLines={2}>
                {movie.title}
              </Text>
              {movie.tagline ? (
                <Text className="text-light-200 mt-1" numberOfLines={2}>
                  {movie.tagline}
                </Text>
              ) : null}
              <Text className="text-light-200 mt-3">
                Rating:{" "}
                <Text className="text-white font-semibold">
                  {movie.vote_average > 0 ? (movie.vote_average / 2).toFixed(1) : "N/A"}
                </Text>
              </Text>
              <Text className="text-light-200 mt-1">
                Runtime:{" "}
                <Text className="text-white font-semibold">
                  {movie.runtime ? `${movie.runtime} min` : "N/A"}
                </Text>
              </Text>
              <Text className="text-light-200 mt-1">
                Release:{" "}
                <Text className="text-white font-semibold">
                  {movie.release_date || "N/A"}
                </Text>
              </Text>
            </View>
          </View>

          <View className="mt-6">
            <Text accessibilityRole="header" className="text-white font-semibold mb-2">Genres</Text>
            <View className="flex-row flex-wrap">
              {movie.genres.map((genre) => (
                <View
                  key={genre.id}
                  className="bg-dark-100 rounded-full px-3 py-2 mr-2 mb-2">
                  <Text className="text-light-100 text-xs">{genre.name}</Text>
                </View>
              ))}
              {movie.genres.length === 0 ? (
                <Text className="text-light-200">N/A</Text>
              ) : null}
            </View>
          </View>

          <View className="mt-6">
            <Text accessibilityRole="header" className="text-white font-semibold mb-2">Overview</Text>
            <Text className="text-light-200 leading-6">
              {movie.overview || "No overview available."}
            </Text>
          </View>

          <View className="mt-8">
            {!hydrated && !savedError ? <Text className="text-light-200 mb-3">Loading your saved movies...</Text> : null}
            {savedError ? <RecoveryMessage message={savedError.message} busy={pending} onRetry={() => void retry()} /> : null}
            <Button
              title={pending ? "Updating saved movies..." : saved ? "Remove from saved" : "Save movie"}
              variant={saved ? "secondary" : "primary"}
              disabled={!hydrated || pending || !summary}
              onPress={() => {
                if (!summary) return;
                void toggle(summary);
              }}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
};

export default MovieDetailsScreen;
