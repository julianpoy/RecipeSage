import { StorageObjectRecord, writeBuffer } from "./index";
import { ObjectTypes } from "./shared";
import { fetchURL, transformImageBuffer } from "../general";
import { sanitizeFilePath } from "./sanitizeFilePath";
import { ImageFetchError } from "./imageFetchError";
import { createReadStream } from "fs";
import { buffer as streamToBuffer } from "stream/consumers";
import type { Readable } from "stream";
import type { ReadableStream } from "stream/web";

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
  if (response.status !== 200 || !response.body)
    throw new ImageFetchError(response.status);

  return writeImageStream(objectType, response.body, highResConversion);
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

  const result = await writeImageStream(
    objectType,
    createReadStream(normalizedPath),
    highResConversion,
  );

  return result;
};

export const writeImageStream = async (
  objectType: ObjectTypes,
  inputStream: Readable | ReadableStream | NodeJS.ReadableStream,
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

  // Buffer the full input before transform so HEIC can be detected and
  // pre-decoded via heic-decode (Sharp's prebuilt libvips cannot decode HEVC).
  const inputBuffer = await streamToBuffer(
    inputStream as Readable | ReadableStream,
  );

  const converted = await transformImageBuffer(
    inputBuffer,
    width,
    height,
    quality,
    highResConversion ? "inside" : "cover",
  );

  return writeBuffer(objectType, converted, "image/jpeg");
};

/**
 * @deprecated Prefer working with streams over buffers please.
 */
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
