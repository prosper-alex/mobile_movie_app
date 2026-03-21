import { Client } from "appwrite";

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

export const isAppwriteConfigured = Boolean(endpoint && projectId);

const client = isAppwriteConfigured
  ? new Client().setEndpoint(endpoint!).setProject(projectId!)
  : null;

export default client;
