import { Client } from "appwrite";
import { Platform } from "react-native";

const getPlatformId = () => {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_APPWRITE_PLATFORM_IOS;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_APPWRITE_PLATFORM_ANDROID;
  }
  return process.env.EXPO_PUBLIC_APPWRITE_PLATFORM_WEB;
};

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const platformId = getPlatformId();
if (!platformId) {
  console.warn(
    "Appwrite platform ID is missing. Set EXPO_PUBLIC_APPWRITE_PLATFORM_IOS/ANDROID/WEB to match your Appwrite dashboard platform.",
  );
} else {
  client.setPlatform(platformId);
}

export default client;
