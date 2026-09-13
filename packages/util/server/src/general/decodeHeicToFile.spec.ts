import { describe, it, expect, vi, afterEach } from "vitest";
import type { SpawnOptions } from "node:child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

let heifConvertArgsOverride: ((args: string[]) => string[]) | undefined;

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: (command: string, args: string[], options: SpawnOptions) =>
      actual.spawn(
        command,
        command === "heif-convert" && heifConvertArgsOverride
          ? heifConvertArgsOverride(args)
          : args,
        options,
      ),
  };
});

import {
  DecodeHeicError,
  decodeHeicToFile,
  parseHeifInfo,
} from "./decodeHeicToFile";

const fixturePath = (name: string) => path.join(__dirname, "fixtures", name);

describe("parseHeifInfo", () => {
  it("reads the images, the primary position and the total pixels", () => {
    const result = parseHeifInfo(
      [
        "image: 640x360 (id=1002), primary",
        "  colorspace: YCbCr, 4:2:0",
        "image: 640x360 (id=1005)",
        "image: 1440x960 (id=1006)",
      ].join("\n"),
    );

    expect(result.images).toEqual([
      { width: 640, height: 360 },
      { width: 640, height: 360 },
      { width: 1440, height: 960 },
    ]);
    expect(result.primaryPosition).toBe(1);
    expect(result.totalPixels).toBe(640 * 360 + 640 * 360 + 1440 * 960);
  });

  it("finds a primary that is not the first image", () => {
    const result = parseHeifInfo(
      [
        "image: 100x100 (id=1)",
        "image: 200x200 (id=2), primary",
        "image: 300x300 (id=3)",
      ].join("\n"),
    );

    expect(result.primaryPosition).toBe(2);
  });

  it("falls back to the first image when nothing is marked primary", () => {
    const result = parseHeifInfo("image: 100x100 (id=1)");

    expect(result.images).toHaveLength(1);
    expect(result.primaryPosition).toBe(1);
  });

  it("does not count indented sub-lines as images, even ones mentioning primary", () => {
    const result = parseHeifInfo(
      [
        "image: 100x100 (id=1)",
        "  note: not, primary at all",
        "image: 200x200 (id=2), primary",
      ].join("\n"),
    );

    expect(result.images).toHaveLength(2);
    expect(result.primaryPosition).toBe(2);
  });
});

describe("decodeHeicToFile", () => {
  afterEach(() => {
    heifConvertArgsOverride = undefined;
  });

  it("decodes to a file and removes the directory once disposed", async () => {
    let imagePath: string;

    {
      await using decoded = await decodeHeicToFile(fixturePath("single.heic"));
      imagePath = decoded.imagePath;

      const meta = await sharp(imagePath).metadata();
      expect(meta.width).toBe(1280);
      expect(meta.height).toBe(720);
    }

    expect(existsSync(imagePath)).toBe(false);
  });

  it("keeps the alpha channel so transparency is not composited onto a checkerboard", async () => {
    await using decoded = await decodeHeicToFile(fixturePath("alpha.heic"));

    const meta = await sharp(decoded.imagePath).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("decodes the primary image rather than the largest in the container", async () => {
    await using decoded = await decodeHeicToFile(fixturePath("grid.heic"));

    const meta = await sharp(decoded.imagePath).metadata();
    expect(meta.width).toBe(640);
    expect(meta.height).toBe(360);
  });

  it("applies the container rotation so the decoded image is upright", async () => {
    await using decoded = await decodeHeicToFile(fixturePath("rotated.heic"));

    const meta = await sharp(decoded.imagePath).metadata();
    expect(meta.width).toBeGreaterThan(meta.height ?? 0);
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("accepts a buffer as well as a path", async () => {
    await using decoded = await decodeHeicToFile(
      await readFile(fixturePath("single.heic")),
    );

    const meta = await sharp(decoded.imagePath).metadata();
    expect(meta.width).toBe(1280);
  });

  it("throws a DecodeHeicError for a file that is not a HEIC", async () => {
    await expect(
      decodeHeicToFile(fixturePath("rgba.png")),
    ).rejects.toBeInstanceOf(DecodeHeicError);
  });

  it("throws a DecodeHeicError when heif-convert does not write the expected file", async () => {
    heifConvertArgsOverride = (args) => [
      ...args.slice(0, -1),
      path.join(path.dirname(args[args.length - 1]), "renamed.png"),
    ];

    const result = decodeHeicToFile(fixturePath("single.heic"));

    await expect(result).rejects.toBeInstanceOf(DecodeHeicError);
    await expect(result).rejects.toThrow(
      "heif-convert did not write out.png. It wrote: renamed.png.",
    );
  });

  it("throws a DecodeHeicError when heif-convert writes an image of the wrong size", async () => {
    heifConvertArgsOverride = (args) => [
      ...args.slice(0, -2),
      fixturePath("alpha.heic"),
      args[args.length - 1],
    ];

    const result = decodeHeicToFile(fixturePath("single.heic"));

    await expect(result).rejects.toBeInstanceOf(DecodeHeicError);
    await expect(result).rejects.toThrow(
      "Expected the primary image to be 1280x720 but out.png is 200x150",
    );
  });
});
