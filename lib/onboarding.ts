import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_STORAGE_KEY = "onboarding_seen_v1";

export const getHasSeenOnboarding = async (): Promise<boolean> => {
  const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  return raw === "1";
};

export const setHasSeenOnboarding = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
};

