import { serverConfig } from "./serverConfig";

const RELATIVE_API_PATH_PATTERN = /^\/?api\//;

export const resolveStorageLocation = (location: string): string => {
  if (RELATIVE_API_PATH_PATTERN.test(location)) {
    return `${serverConfig.apiBase}${location.replace(RELATIVE_API_PATH_PATTERN, "")}`;
  }

  if (location.startsWith("/minio/")) {
    return new URL(location, serverConfig.apiBase).toString();
  }

  return location;
};
