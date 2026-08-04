import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { readSideCarImages } from "./sideCarImages";

describe("readSideCarImages", () => {
  const setup = async (files: Record<string, string>) => {
    const dir = await mkdtemp(path.join(tmpdir(), "sidecar-"));
    for (const [name, contents] of Object.entries(files)) {
      await writeFile(path.join(dir, name), contents);
    }
    return dir;
  };

  it("finds an image named after the recipe file", async () => {
    const dir = await setup({
      "recipe.txt": "Title",
      "recipe.png": "image-bytes",
    });

    const images = await readSideCarImages(dir, "recipe.txt");

    expect(images).toHaveLength(1);
    expect(Buffer.isBuffer(images[0])).toBe(true);
    expect(images[0].toString()).toEqual("image-bytes");
  });

  it("finds an image alongside a pdf", async () => {
    const dir = await setup({
      "recipe.pdf": "pdf",
      "recipe.jpg": "jpg-bytes",
    });

    const images = await readSideCarImages(dir, "recipe.pdf");

    expect(images.map((image) => image.toString())).toEqual(["jpg-bytes"]);
  });

  it("returns nothing when there is no side car image", async () => {
    const dir = await setup({ "recipe.txt": "Title" });

    expect(await readSideCarImages(dir, "recipe.txt")).toEqual([]);
  });

  it("finds every supported extension", async () => {
    const dir = await setup({
      "recipe.txt": "Title",
      "recipe.png": "a",
      "recipe.webp": "b",
    });

    const images = await readSideCarImages(dir, "recipe.txt");

    expect(images.map((image) => image.toString()).sort()).toEqual(["a", "b"]);
  });
});
