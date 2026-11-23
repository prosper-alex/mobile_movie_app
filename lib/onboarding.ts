import { completeMovieOnboarding, getMoviePreferences } from "@/lib/preferences";

// Preserve the exported legacy key for compatibility; new writes use one
// preference record rather than splitting genres and completion across keys.
export { LEGACY_ONBOARDING_STORAGE_KEY as ONBOARDING_STORAGE_KEY } from "@/lib/preferencesStorage";

export const getHasSeenOnboarding = async (): Promise<boolean> => {
  return (await getMoviePreferences()).onboardingCompleted;
};

export const setHasSeenOnboarding = async (): Promise<void> => {
  await completeMovieOnboarding();
};

