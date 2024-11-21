import { readFile } from "fs/promises";
import { fetchURL } from "./fetch";

export const transformRecipeImageUrlForSelfhost = async (location: string) => {
  if (process.env.NODE_ENV !== "selfhost") return location;

  if (location.startsWith("http://") || location.startsWith("https://")) {
    return location;
  }

  if (location.startsWith("/minio/")) {
    const path = process.env.AWS_ENDPOINT + location.replace("/minio/", "");
    const data = await fetchURL(path);
    const buffer = await data.buffer();
    const base64 = buffer.toString("base64");

    return `data:image/png;base64,${base64}`;
  }

  if (location.startsWith("/") || location.startsWith("api/")) {
    if (!process.env.FILESYSTEM_STORAGE_PATH) {
      console.error("Critical: ENV var FILESYSTEM_STORAGE_PATH not defined!");
      throw new Error("ENV var FILESYSTEM_STORAGE_PATH not defined");
    }

    const data = await readFile(
      location.replace(
        /^\/?api\/images\/filesystem/,
        process.env.FILESYSTEM_STORAGE_PATH,
      ),
    );
    const base64 = data.toString("base64");

    return `data:image/png;base64,${base64}`;
  }

  console.error("Critical: " + "Unrecognized URL format: " + location);
  throw new Error("Unrecognized URL format: " + location);
};
