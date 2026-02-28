// Track the searches made by a user
import { Client, Databases } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_TABLE_ID!;

const client = new Client();
client.setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!);
client.setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const database = new Databases(client);

export const earchCount = async (query: string, Mmovie: Movie) => {
};
