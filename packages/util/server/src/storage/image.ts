import { StorageObjectRecord, writeBuffer } from "./index";
import { ObjectTypes } from "./shared";
import {
  fetchURL,
  transformImageBuffer,
  transformImageFile,
  fetchBufferViaScrapfly,
} from "../general";
import { sanitizeFilePath } from "./sanitizeFilePath";
import { ImageFetchError } from "./imageFetchError";
import { buffer as streamToBuffer } from "stream/consumers";
import { Readable } from "stream";
import type { ReadableStream } from "stream/web";
import type { FitEnum } from "sharp";

const HIGH_RES_IMG_CONVERSION_WIDTH = 1024;
const HIGH_RES_IMG_CONVERSION_HEIGHT = 1024;
const HIGH_RES_IMG_CONVERSION_QUALITY = 55;

const LOW_RES_IMG_CONVERSION_WIDTH = 200;
const LOW_RES_IMG_CONVERSION_HEIGHT = 200;
const LOW_RES_IMG_CONVERSION_QUALITY = 55;

const WRITE_IMAGE_URL_TIMEOUT_SECONDS = 15;
const SCRAPFLY_FALLBACK_STATUSES = new Set([403, 429, 503]);

const resolveConversionOptions = (
  highResConversion: boolean,
): {
  width: number;
  height: number;
  quality: number;
  fit: keyof FitEnum;
} =>
  highResConversion
    ? {
        width: HIGH_RES_IMG_CONVERSION_WIDTH,
        height: HIGH_RES_IMG_CONVERSION_HEIGHT,
        quality: HIGH_RES_IMG_CONVERSION_QUALITY,
        fit: "inside",
      }
    : {
        width: LOW_RES_IMG_CONVERSION_WIDTH,
        height: LOW_RES_IMG_CONVERSION_HEIGHT,
        quality: LOW_RES_IMG_CONVERSION_QUALITY,
        fit: "cover",
      };

export const writeImageURL = async (
  objectType: ObjectTypes,
  url: string,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const response = await fetchURL(url, {
    timeout: WRITE_IMAGE_URL_TIMEOUT_SECONDS * 1000,
  });

  if (response.status === 200 && response.body) {
    return writeImageStream(objectType, response.body, highResConversion);
  }

  if (
    SCRAPFLY_FALLBACK_STATUSES.has(response.status) &&
    process.env.SCRAPFLY_API_KEY
  ) {
    const buffer = await fetchBufferViaScrapfly(url);
    return writeImageStream(
      objectType,
      Readable.from(buffer),
      highResConversion,
    );
  }

  throw new ImageFetchError(response.status);
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

  const { width, height, quality, fit } =
    resolveConversionOptions(highResConversion);

  const converted = await transformImageFile(
    normalizedPath,
    width,
    height,
    quality,
    fit,
  );

  return writeBuffer(objectType, converted, "image/jpeg");
};

export const writeImageStream = async (
  objectType: ObjectTypes,
  inputStream: Readable | ReadableStream | NodeJS.ReadableStream,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const { width, height, quality, fit } =
    resolveConversionOptions(highResConversion);

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
    fit,
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
  const { width, height, quality, fit } =
    resolveConversionOptions(highResConversion);

  const converted = await transformImageBuffer(
    buffer,
    width,
    height,
    quality,
    fit,
  );

  const result = await writeBuffer(objectType, converted, "image/jpeg");

  return result;
};
