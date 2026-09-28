import { config } from "./config";

const RELATIVE_API_PATH_PATTERN = /^\/?api\//;

export const resolveStorageLocationToPublicUrl = (location: string): string => {
  if (RELATIVE_API_PATH_PATTERN.test(location)) {
    return `${config.api.publicUrl}/${location.replace(RELATIVE_API_PATH_PATTERN, "")}`;
  }

  if (location.startsWith("/minio/")) {
    return new URL(location, config.api.publicUrl).toString();
  }

  return location;
};
