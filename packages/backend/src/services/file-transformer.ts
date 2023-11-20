import { Readable, Writable } from "stream";
import * as sharp from "sharp";

export const transformImageStream = async (
  inputStream: Readable,
  outputStream: Writable,
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
) => {
  const transformer = sharp()
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    })
    .pipe(outputStream);

  inputStream.pipe(transformer);
};

export const transformImageBuffer = async (
  buffer: Buffer,
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
) => {
  return sharp(buffer)
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    })
    .toBuffer();
};
