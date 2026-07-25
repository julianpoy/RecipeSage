import { Readable } from "stream";
import { buffer as streamToBuffer } from "stream/consumers";
import sharp from "sharp";
import decodeHeic from "heic-decode";
import pLimit from "p-limit";

sharp.concurrency(1);

const sharpConcurrencyLimit = pLimit(1);

export class FileTransformError extends Error {
  constructor() {
    super();
    this.name = "FileTransformError";
  }
}

// HEIC/HEIF ftyp brands that require HEVC decoding. Sharp's prebuilt libvips
// has HEVC disabled (patent licensing), so we route these through heic-decode.
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
// route AVIF through heic-decode even when a file's major brand is the generic
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

const createSharpFromBuffer = async (buffer: Buffer) => {
  if (!isHeic(buffer)) return sharp(buffer);

  // @types/heic-decode declares buffer as ArrayBufferLike, but the runtime
  // accepts a Node Buffer / Uint8Array directly (it calls .slice on it).
  const { width, height, data } = await decodeHeic({
    buffer: buffer as unknown as ArrayBufferLike,
  });
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width, height, channels: 4 },
  });
};

export const transformImageStream = (
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
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
  fit: keyof sharp.FitEnum,
) => {
  const input = await streamToBuffer(inputStream);
  return transformImageBuffer(input, width, height, quality, fit);
};

export const transformImageBuffer = async (
  buffer: Buffer,
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
) =>
  sharpConcurrencyLimit(async () => {
    try {
      const pipeline = await createSharpFromBuffer(buffer);
      return await pipeline
        .rotate() // Rotates based on EXIF data (no-op when input is raw RGBA from HEIC)
        .resize(width, height, {
          fit,
          withoutEnlargement: true,
        })
        .jpeg({
          quality,
          // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
        })
        .toBuffer();
    } catch {
      throw new FileTransformError();
    }
  });
