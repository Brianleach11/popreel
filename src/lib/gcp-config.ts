import { Storage } from "@google-cloud/storage";
import { VideoIntelligenceServiceClient } from "@google-cloud/video-intelligence";

export const getGCPCredentials = () => {
  // for Vercel, use environment variables
  if (process.env.GCP_PRIVATE_KEY) {
    return {
      credentials: {
        client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Fix escaped newlines
      },
      projectId: process.env.GCP_PROJECT_ID,
    };
  }
  // for local development, use Application Default Credentials
  return {};
};

// Initialize Storage client with credentials
export const storage = new Storage(getGCPCredentials());

// Initialize Video Intelligence client with credentials
export const videoIntelligenceClient = new VideoIntelligenceServiceClient(
  getGCPCredentials()
);

export const bucketName = process.env.GCS_BUCKET_NAME!;
