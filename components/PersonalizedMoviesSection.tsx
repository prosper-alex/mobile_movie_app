import MovieCard from "@/components/MovieCard";
import RecoveryMessage from "@/components/RecoveryMessage";
import { getMoviePreferences } from "@/lib/preferences";
import { fetchMoviesByGenres } from "@/services/api";
import useFetch from "@/services/useFetch";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

export default function PersonalizedMoviesSection() {
  const { width, fontScale } = useWindowDimensions();
  const stackHeader = width < 380 || fontScale >= 1.5;
  const router = useRouter();
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState<Error | null>(null);
  const preferenceLoadId = useRef(0);
  const fetcher = useCallback(
    (signal?: AbortSignal) => fetchMoviesByGenres(genreIds, signal),
    [genreIds],
  );
  const { data: movies, loading, error, refetch, reset, cancel } = useFetch<Movie[]>(fetcher, false);

  const loadPreferences = useCallback(async () => {
    const requestId = ++preferenceLoadId.current;
    cancel();
    reset();
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      const preferences = await getMoviePreferences();
      if (requestId !== preferenceLoadId.current) return;
      setGenreIds([...preferences.genreIds]);
      setPreferencesLoading(false);
    } catch {
      if (requestId !== preferenceLoadId.current) return;
      setPreferencesError(new Error("Couldn't load your saved genres. Please retry."));
      setPreferencesLoading(false);
    }
  }, [cancel, reset]);

  useFocusEffect(useCallback(() => {
    void loadPreferences();
    return () => {
      preferenceLoadId.current++;
      cancel();
    };
  }, [cancel, loadPreferences]));

  useEffect(() => {
    if (preferencesLoading || preferencesError) return;
    if (genreIds.length === 0) {
      cancel();
      reset();
      return;
    }
    // Clear results for the old genre set before starting the next request.
    reset();
    void refetch();
    return cancel;
  }, [cancel, genreIds, preferencesError, preferencesLoading, refetch, reset]);

  const retryPreferences = () => void loadPreferences();
  const editPreferences = () => router.push(
    { pathname: "/genre-preferences", params: { mode: "edit" } } as unknown as Href,
  );

  return (
    <View className="mb-7">
      <View className={[stackHeader ? "gap-y-2" : "flex-row items-center justify-between", "mb-3"].join(" ")}>
        <Text accessibilityRole="header" className={["text-lg text-white font-bold", stackHeader ? "" : "flex-1 mr-2"].join(" ")}>
          Based on your genres
        </Text>
        {!preferencesLoading && !preferencesError && genreIds.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh genre recommendations"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
            onPress={() => void refetch()}
            style={{ minHeight: 48, minWidth: 48 }}
            className={["min-h-12 min-w-12 items-center justify-center px-3 rounded-full bg-dark-100", stackHeader ? "self-start" : "shrink-0"].join(" ")}
          >
            <Text className="text-accent font-semibold">{loading ? "Loading" : "Refresh"}</Text>
          </Pressable>
        ) : null}
      </View>

      {preferencesLoading ? (
        <View className="flex-row items-center gap-x-2 py-2">
          <ActivityIndicator size="small" color="#AB8BFF" />
          <Text className="text-light-200">Loading your movie preferences...</Text>
        </View>
      ) : preferencesError ? (
        <RecoveryMessage message={preferencesError.message} onRetry={retryPreferences} />
      ) : genreIds.length === 0 ? (
        <View className="bg-dark-100/60 border border-dark-100 rounded-2xl p-4">
          <Text className="text-light-200 mb-3">Choose a few genres to see movies picked for your taste.</Text>
          <Pressable accessibilityRole="button" onPress={editPreferences} style={{ minHeight: 48 }} className="self-start min-h-12 justify-center px-4 rounded-full bg-dark-100">
            <Text className="text-accent font-semibold">Choose genres</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {loading && !movies ? (
            <View className="flex-row items-center gap-x-2 py-3">
              <ActivityIndicator size="small" color="#AB8BFF" />
              <Text className="text-light-200">Finding movies for your genres...</Text>
            </View>
          ) : null}
          {error ? <RecoveryMessage message={error.message} onRetry={() => void refetch()} /> : null}
          {!loading && !error && movies?.length === 0 ? (
            <Text className="text-light-200 py-2">No movies matched these genres. Try refreshing or choosing different genres.</Text>
          ) : null}
          {movies && movies.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              {movies.map((movie) => (
                <View key={movie.id} style={{ width: 136, marginRight: 12 }}>
                  <MovieCard {...movie} />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      )}
    </View>
  );
}
