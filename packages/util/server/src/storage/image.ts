import { StorageObjectRecord, writeBuffer } from "./index";
import { ObjectTypes } from "./shared";
import fs from "fs/promises";
import { fetchURL, transformImageBuffer } from "../general";
import { sanitizeFilePath } from "./sanitizeFilePath";

const HIGH_RES_IMG_CONVERSION_WIDTH = 1024;
const HIGH_RES_IMG_CONVERSION_HEIGHT = 1024;
const HIGH_RES_IMG_CONVERSION_QUALITY = 55;

const LOW_RES_IMG_CONVERSION_WIDTH = 200;
const LOW_RES_IMG_CONVERSION_HEIGHT = 200;
const LOW_RES_IMG_CONVERSION_QUALITY = 55;

const WRITE_IMAGE_URL_TIMEOUT_SECONDS = 15;
export const writeImageURL = async (
  objectType: ObjectTypes,
  url: string,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const response = await fetchURL(url, {
    timeout: WRITE_IMAGE_URL_TIMEOUT_SECONDS * 1000,
  });
  if (response.status !== 200)
    throw new Error(`Could not fetch image: ${response.status}`);
  const buffer = await response.buffer();

  return writeImageBuffer(objectType, buffer, highResConversion);
};

export const writeImageFile = async (
  objectType: ObjectTypes,
  filePath: string,
  highResConversion: boolean,
  rootPath: string,
): Promise<StorageObjectRecord> => {
  const normalizedPath = sanitizeFilePath({
    mustStartWith: rootPath,
    filePath: filePath,
  });

  const buffer = await fs.readFile(normalizedPath);

  return writeImageBuffer(objectType, buffer, highResConversion);
};

export const writeImageBuffer = async (
  objectType: ObjectTypes,
  buffer: Buffer,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const height = highResConversion
    ? HIGH_RES_IMG_CONVERSION_HEIGHT
    : LOW_RES_IMG_CONVERSION_HEIGHT;
  const width = highResConversion
    ? HIGH_RES_IMG_CONVERSION_WIDTH
    : LOW_RES_IMG_CONVERSION_WIDTH;
  const quality = highResConversion
    ? HIGH_RES_IMG_CONVERSION_QUALITY
    : LOW_RES_IMG_CONVERSION_QUALITY;

  const converted = await transformImageBuffer(
    buffer,
    width,
    height,
    quality,
    highResConversion ? "inside" : "cover",
  );

  const result = await writeBuffer(objectType, converted, "image/jpeg");

  return result;
};
