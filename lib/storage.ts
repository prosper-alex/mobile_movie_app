import AsyncStorage from "@react-native-async-storage/async-storage";

// Reads may be abandoned safely; writes must settle before reporting success/failure.
export async function readStoredItem(key: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      AsyncStorage.getItem(key),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Storage read timed out.")), 8000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
