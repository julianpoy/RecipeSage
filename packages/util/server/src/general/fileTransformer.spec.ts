import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import sharp from "sharp";
import {
  FileTransformError,
  isHeic,
  transformImageBuffer,
  transformImageFile,
  transformImageStreamToBuffer,
} from "./fileTransformer";

const fixturePath = (name: string) => path.join(__dirname, "fixtures", name);

const fixture = (name: string) => readFile(fixturePath(name));

const isJpeg = (buf: Buffer) =>
  buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

describe("isHeic", () => {
  it("returns true for a HEIC file", async () => {
    expect(isHeic(await fixture("single.heic"))).toBe(true);
    expect(isHeic(await fixture("grid.heic"))).toBe(true);
  });

  it("returns false for non-HEIC images (JPEG, PNG, AVIF)", async () => {
    expect(isHeic(await fixture("photo-exif-orientation-6.jpg"))).toBe(false);
    expect(isHeic(await fixture("rgba.png"))).toBe(false);
    expect(isHeic(await fixture("sample.avif"))).toBe(false);
  });

  it("returns false for non-image input", () => {
    expect(isHeic(Buffer.from("not an image"))).toBe(false);
    expect(isHeic(Buffer.alloc(0))).toBe(false);
  });
});

describe("transformImageBuffer", () => {
  it("converts a single-image HEIC to JPEG", async () => {
    const input = await fixture("single.heic");

    const output = await transformImageBuffer(input, 512, 512, 55, "inside");

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(512);
  });

  it("converts a grid (multi-tile) HEIC to JPEG", async () => {
    const input = await fixture("grid.heic");

    const output = await transformImageBuffer(input, 400, 400, 55, "inside");

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(400);
  });

  it("converts a JPEG and applies EXIF orientation so the output is displayed upright", async () => {
    const input = await fixture("photo-exif-orientation-6.jpg");

    const output = await transformImageBuffer(input, 500, 500, 80, "inside");

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    // Stored 400x600 with orientation=6 → displayed is landscape (600x400).
    expect(meta.width).toBeGreaterThan(meta.height ?? 0);
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("converts a PNG (with alpha) to JPEG", async () => {
    const input = await fixture("rgba.png");

    const output = await transformImageBuffer(input, 200, 200, 70, "inside");

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.channels).toBe(3); // alpha flattened
  });

  it("converts an AVIF to JPEG via Sharp (not heic-decode)", async () => {
    const input = await fixture("sample.avif");

    const output = await transformImageBuffer(input, 200, 200, 70, "inside");

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("crops to exact dimensions with fit='cover'", async () => {
    const input = await fixture("photo-exif-orientation-6.jpg");

    const output = await transformImageBuffer(input, 150, 150, 55, "cover");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(150);
    expect(meta.height).toBe(150);
  });

  it("throws FileTransformError when the input is not a valid image", async () => {
    await expect(
      transformImageBuffer(Buffer.from("not an image"), 100, 100, 55, "inside"),
    ).rejects.toBeInstanceOf(FileTransformError);
  });
});

describe("transformImageStreamToBuffer", () => {
  it("converts a HEIC stream to a JPEG buffer", async () => {
    const input = await fixture("single.heic");

    const output = await transformImageStreamToBuffer(
      Readable.from(input),
      300,
      300,
      55,
      "inside",
    );

    expect(isJpeg(output)).toBe(true);
  });

  it("converts a JPEG stream to a resized JPEG buffer", async () => {
    const input = await fixture("photo-exif-orientation-6.jpg");

    const output = await transformImageStreamToBuffer(
      Readable.from(input),
      300,
      300,
      55,
      "inside",
    );

    expect(isJpeg(output)).toBe(true);
  });
});

describe("transformImageFile", () => {
  it("converts a JPEG file to a resized JPEG buffer", async () => {
    const output = await transformImageFile(
      fixturePath("photo-exif-orientation-6.jpg"),
      300,
      300,
      55,
      "inside",
    );

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("applies EXIF orientation so the output is displayed upright", async () => {
    const output = await transformImageFile(
      fixturePath("photo-exif-orientation-6.jpg"),
      500,
      500,
      80,
      "inside",
    );

    const meta = await sharp(output).metadata();
    expect(meta.width).toBeGreaterThan(meta.height ?? 0);
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("routes a HEIC file through heic-decode using only the file header", async () => {
    const output = await transformImageFile(
      fixturePath("single.heic"),
      512,
      512,
      55,
      "inside",
    );

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
  });

  it("converts a grid (multi-tile) HEIC file", async () => {
    const output = await transformImageFile(
      fixturePath("grid.heic"),
      400,
      400,
      55,
      "inside",
    );

    expect(isJpeg(output)).toBe(true);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(400);
  });

  it("converts an AVIF file via Sharp rather than heic-decode", async () => {
    const output = await transformImageFile(
      fixturePath("sample.avif"),
      200,
      200,
      70,
      "inside",
    );

    expect(isJpeg(output)).toBe(true);
  });

  it("produces the same dimensions as the buffer path", async () => {
    const name = "rgba.png";

    const fromFile = await transformImageFile(
      fixturePath(name),
      200,
      200,
      70,
      "cover",
    );
    const fromBuffer = await transformImageBuffer(
      await fixture(name),
      200,
      200,
      70,
      "cover",
    );

    const fileMeta = await sharp(fromFile).metadata();
    const bufferMeta = await sharp(fromBuffer).metadata();
    expect(fileMeta.width).toBe(bufferMeta.width);
    expect(fileMeta.height).toBe(bufferMeta.height);
    expect(fileMeta.channels).toBe(bufferMeta.channels);
  });

  it("throws FileTransformError when the file is not a valid image", async () => {
    await expect(
      transformImageFile(__filename, 100, 100, 55, "inside"),
    ).rejects.toBeInstanceOf(FileTransformError);
  });

  it("throws FileTransformError when the file does not exist", async () => {
    await expect(
      transformImageFile(
        fixturePath("does-not-exist.jpg"),
        100,
        100,
        55,
        "inside",
      ),
    ).rejects.toBeInstanceOf(FileTransformError);
  });
});
