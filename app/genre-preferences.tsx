import Button from "@/components/Button";
import RecoveryMessage from "@/components/RecoveryMessage";
import Screen from "@/components/Screen";
import { fetchMovieGenres, type MovieGenre } from "@/services/api";
import useFetch from "@/services/useFetch";
import {
  cacheMovieGenreCatalogue,
  completeMovieOnboarding,
  getCachedMovieGenreCatalogue,
  getMoviePreferences,
  saveMovieGenres,
} from "@/lib/preferences";
import { useAuth } from "@/providers/AuthProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

export default function GenrePreferencesScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === "edit";
  const { state, login } = useAuth();
  const fetcher = useCallback((signal?: AbortSignal) => fetchMovieGenres(signal), []);
  const { data: genres, loading: genresLoading, error: genresError, refetch } = useFetch<MovieGenre[]>(fetcher);
  const [cachedGenres, setCachedGenres] = useState<MovieGenre[] | null>(null);
  const [genreCacheLoaded, setGenreCacheLoaded] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [preferenceAttempt, setPreferenceAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getCachedMovieGenreCatalogue().then((cached) => {
      if (!cancelled) setCachedGenres(cached);
    }).catch(() => {
      // A broken optional cache must not block the live catalogue request.
      if (!cancelled) setCachedGenres(null);
    }).finally(() => {
      if (!cancelled) setGenreCacheLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (genres) void cacheMovieGenreCatalogue(genres).catch(() => undefined);
  }, [genres]);

  useEffect(() => {
    let cancelled = false;
    setPreferencesLoaded(false);
    setPreferencesError(null);
    getMoviePreferences().then((preferences) => {
      if (cancelled) return;
      setSelected([...preferences.genreIds]);
      setPreferencesLoaded(true);
    }).catch(() => {
      if (!cancelled) setPreferencesError("Couldn't load your saved preferences. Retry to protect your current selection.");
    });
    return () => { cancelled = true; };
  }, [preferenceAttempt]);

  const toggleGenre = (id: number) => {
    setSelected((current) => current.includes(id)
      ? current.filter((genreId) => genreId !== id)
      : [...current, id]);
    setSaveError(null);
  };

  const finishAsGuest = async () => {
    if (state.status !== "authenticated") await login({ name: "Guest" });
    router.replace("/(tabs)");
  };

  const handleSave = async () => {
    if (inFlight.current || !preferencesLoaded) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError(null);
    let persisted = false;
    try {
      if (editing) {
        await saveMovieGenres(selected);
        persisted = true;
        router.back();
      } else {
        await completeMovieOnboarding(selected);
        persisted = true;
        await finishAsGuest();
      }
    } catch {
      setSaveError(persisted
        ? "Your preferences are saved, but MovieFlix couldn't continue. Try again."
        : "Couldn't save your preferences. Your selection is still here; try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const handleExplore = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      // No genre argument means preserve the saved selection, including on skip.
      await completeMovieOnboarding();
      await finishAsGuest();
    } catch {
      setSaveError("Couldn't continue yet because your preferences couldn't be saved. Please retry.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const availableGenres = genres ?? cachedGenres;
  const canSelect = preferencesLoaded && Boolean(availableGenres?.length) && !saving;

  return (
    <Screen className="px-5">
      <View className="flex-1 pt-5">
        <View className="mb-5">
          <Text className="text-light-200 text-sm mb-2">{editing ? "MOVIE PREFERENCES" : "PERSONALIZE YOUR MOVIEFLIX"}</Text>
          <Text accessibilityRole="header" className="text-3xl font-extrabold text-white mb-2">
            {editing ? "Edit your genres" : "What do you like to watch?"}
          </Text>
          <Text className="text-light-200">
            Choose any genres you enjoy. You can change these later in Profile.
          </Text>
          <Text className="text-light-200 mt-3" accessibilityLiveRegion="polite">
            {selected.length} {selected.length === 1 ? "genre" : "genres"} selected
          </Text>
        </View>

        {genresLoading && !availableGenres?.length && !genreCacheLoaded ? (
          <View className="flex-1 items-center justify-center" accessibilityRole="progressbar" accessibilityLabel="Loading movie genres">
            <ActivityIndicator size="large" color="#AB8BFF" />
            <Text className="text-light-200 mt-3">Loading movie genres...</Text>
          </View>
        ) : genresError && !availableGenres?.length ? (
          <View className="flex-1 justify-center">
            <RecoveryMessage message={genresError.message} onRetry={() => void refetch()} />
          </View>
        ) : availableGenres?.length ? (
          <>
            {genresError ? (
              <RecoveryMessage
                message="Couldn't refresh the genre list. Showing the last catalogue saved on this device."
                onRetry={() => void refetch()}
              />
            ) : genresLoading ? (
              <Text className="text-light-300 mb-2">Refreshing saved genre catalogue...</Text>
            ) : null}
          <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {availableGenres.map((genre) => {
              const checked = selected.includes(genre.id);
              return (
                <Pressable
                  key={genre.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${genre.name}, ${checked ? "selected" : "not selected"}`}
                  accessibilityState={{ checked, disabled: !canSelect }}
                  disabled={!canSelect}
                  onPress={() => toggleGenre(genre.id)}
                  style={{ minHeight: 48 }}
                  className={[
                    "min-h-12 px-4 py-3 rounded-full border items-center justify-center",
                    checked ? "bg-accent border-accent" : "bg-dark-100 border-dark-100",
                    !canSelect ? "opacity-50" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <Text className={checked ? "text-secondary font-semibold" : "text-white font-medium"}>
                    {checked ? `✓ ${genre.name}` : genre.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          </>
        ) : genresLoading || !genreCacheLoaded ? (
          <View className="flex-1 items-center justify-center" accessibilityRole="progressbar" accessibilityLabel="Loading movie genres">
            <ActivityIndicator size="large" color="#AB8BFF" />
            <Text className="text-light-200 mt-3">Loading movie genres...</Text>
          </View>
        ) : (
          <View className="flex-1 justify-center">
            <Text className="text-white font-semibold text-lg">No movie genres are available right now.</Text>
            <Text className="text-light-200 mt-2">Try loading the list again, or continue exploring without preferences.</Text>
            <View className="mt-4"><Button title="Retry genres" variant="secondary" onPress={() => void refetch()} /></View>
          </View>
        )}

        {preferencesError ? (
          <RecoveryMessage
            message={preferencesError}
            onRetry={() => setPreferenceAttempt((attempt) => attempt + 1)}
          />
        ) : null}
        {saveError ? <RecoveryMessage message={saveError} /> : null}

        <View className="gap-y-3 pb-5 pt-2">
          {editing ? (
            <>
              <Button title={saving ? "Saving..." : "Save preferences"} disabled={saving || !preferencesLoaded || !availableGenres?.length} onPress={() => void handleSave()} />
              <Button title="Cancel" variant="secondary" disabled={saving} onPress={() => router.back()} />
            </>
          ) : (
            <>
              <Button title={saving ? "Saving..." : "Save and continue"} disabled={saving || !preferencesLoaded || !availableGenres?.length} onPress={() => void handleSave()} />
              <Button title={saving ? "Saving..." : "Explore without preferences"} variant="secondary" disabled={saving} onPress={() => void handleExplore()} />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
