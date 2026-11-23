import AsyncStorage from "@react-native-async-storage/async-storage";
import { createPreferencesStorage } from "@/lib/preferencesStorage";
import { readStoredItem } from "@/lib/storage";

// Uses the same bounded reads and native storage as the Phase 1B implementation.
const preferences = createPreferencesStorage({
  getItem: readStoredItem,
  setItem: (key, value) => AsyncStorage.setItem(key, value),
});

export const getMoviePreferences = preferences.load;
export const saveMovieGenres = preferences.saveGenres;
export const completeMovieOnboarding = preferences.completeOnboarding;
export const getCachedMovieGenreCatalogue = preferences.loadGenreCatalogue;
export const cacheMovieGenreCatalogue = preferences.saveGenreCatalogue;

export type { MoviePreferences } from "@/lib/preferencesStorage";
