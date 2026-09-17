import { Readable } from "stream";
import { buffer as streamToBuffer } from "stream/consumers";
import { open } from "fs/promises";
import sharp, { type FitEnum, type Sharp } from "sharp";
import pLimit from "p-limit";
import {
  decodeHeicToFile,
  DecodeHeicSpawnError,
  DecodeHeicTimeoutError,
} from "./decodeHeicToFile";

sharp.concurrency(1);
sharp.cache(false);

const sharpConcurrencyLimit = pLimit(1);

const FILE_HEADER_PEEK_BYTES = 4096;

export class FileTransformError extends Error {
  constructor() {
    super();
    this.name = "FileTransformError";
  }
}

// HEIC/HEIF ftyp brands that require HEVC decoding. Sharp's prebuilt libvips
// has HEVC disabled (patent licensing), so we route these through heif-convert.
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
]);
// AVIF uses AV1 codec, which Sharp's prebuilt libvips DOES support. Must not
// route AVIF through heif-convert even when a file's major brand is the generic
// "mif1"/"msf1" HEIF container.
const AVIF_BRANDS = new Set(["avif", "avis"]);

export const isHeic = (buffer: Buffer): boolean => {
  if (buffer.length < 16) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;

  // ftyp box: major_brand (8-12), minor_version (12-16), compatible_brands...
  const ftypSize = buffer.readUInt32BE(0);
  const brandsEnd = Math.min(ftypSize, buffer.length);
  const brands: string[] = [buffer.toString("ascii", 8, 12)];
  for (let i = 16; i + 4 <= brandsEnd; i += 4) {
    brands.push(buffer.toString("ascii", i, i + 4));
  }

  // Any AVIF brand anywhere in the ftyp box disqualifies HEIC routing.
  if (brands.some((b) => AVIF_BRANDS.has(b))) return false;
  return brands.some((b) => HEIC_BRANDS.has(b));
};

export const transformImageStream = (
  width: number,
  height: number,
  quality: number,
  fit: keyof FitEnum,
) => {
  return sharp()
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
      withoutEnlargement: true,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    });
};

export const transformImageStreamToBuffer = async (
  inputStream: Readable,
  width: number,
  height: number,
  quality: number,
  fit: keyof FitEnum,
) => {
  const input = await streamToBuffer(inputStream);
  return transformImageBuffer(input, width, height, quality, fit);
};

const resizeToJpegBuffer = (
  pipeline: Sharp,
  width: number,
  height: number,
  quality: number,
  fit: keyof FitEnum,
) =>
  pipeline
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
      withoutEnlargement: true,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    })
    .toBuffer();

const transformHeic = async (
  input: Buffer | string,
  width: number,
  height: number,
  quality: number,
  fit: keyof FitEnum,
) => {
  try {
    await using decoded = await decodeHeicToFile(input);

    return await resizeToJpegBuffer(
      sharp(decoded.imagePath),
      width,
      height,
      quality,
      fit,
    );
  } catch (e) {
    if (
      e instanceof DecodeHeicSpawnError ||
      e instanceof DecodeHeicTimeoutError
    ) {
      console.error(e);
    }
    throw e;
  }
};

const readFileHeader = async (filePath: string) => {
  const handle = await open(filePath, "r");
  try {
    const header = Buffer.alloc(FILE_HEADER_PEEK_BYTES);
    const { bytesRead } = await handle.read(
      header,
      0,
      FILE_HEADER_PEEK_BYTES,
      0,
    );
    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

export const transformImageBuffer = async (
  buffer: Buffer,
  width: number,
  height: number,
  quality: number,
  fit: keyof FitEnum,
) =>
  sharpConcurrencyLimit(async () => {
    try {
      if (isHeic(buffer)) {
        return await transformHeic(buffer, width, height, quality, fit);
      }

      return await resizeToJpegBuffer(
        sharp(buffer),
        width,
        height,
        quality,
        fit,
      );
    } catch {
      throw new FileTransformError();
    }
  });

export const transformImageFile = async (
  filePath: string,
  width: number,
  height: number,
  quality: number,
  fit: keyof FitEnum,
) =>
  sharpConcurrencyLimit(async () => {
    try {
      const header = await readFileHeader(filePath);

      if (isHeic(header)) {
        return await transformHeic(filePath, width, height, quality, fit);
      }

      return await resizeToJpegBuffer(
        sharp(filePath),
        width,
        height,
        quality,
        fit,
      );
    } catch {
      throw new FileTransformError();
    }
  });
