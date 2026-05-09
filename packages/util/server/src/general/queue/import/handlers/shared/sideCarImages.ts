import { readFile } from "fs/promises";
import path from "path";

const SIDE_CAR_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
];

export const readSideCarImages = async (
  extractPath: string,
  baseName: string,
): Promise<string[]> => {
  const images: string[] = [];
  for (const extension of SIDE_CAR_IMAGE_EXTENSIONS) {
    const fileContents = await readFile(
      path.join(extractPath, `${baseName}${extension}`),
      "base64",
    ).catch(() => null);
    if (fileContents) images.push(fileContents);
  }
  return images;
};
