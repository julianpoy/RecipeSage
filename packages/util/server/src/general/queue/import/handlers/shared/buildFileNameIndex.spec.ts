import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { buildFileNameIndex } from "./buildFileNameIndex";

describe("buildFileNameIndex", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "file-index-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("indexes files in nested directories by lowercased name", async () => {
    await mkdir(path.join(root, "images", "deep"), { recursive: true });
    await writeFile(path.join(root, "Top.JPG"), "a");
    await writeFile(path.join(root, "images", "deep", "nested.png"), "b");

    const index = await buildFileNameIndex(root);

    expect(index.get("top.jpg")).toEqual([path.join(root, "Top.JPG")]);
    expect(index.get("nested.png")).toEqual([
      path.join(root, "images", "deep", "nested.png"),
    ]);
  });

  it("matches a name regardless of the case it was stored in", async () => {
    await writeFile(path.join(root, "Photo Of Cake.Jpeg"), "a");

    const index = await buildFileNameIndex(root);

    expect(index.get("photo of cake.jpeg")).toHaveLength(1);
  });

  it("keeps every path when a name appears more than once", async () => {
    await mkdir(path.join(root, "a"), { recursive: true });
    await mkdir(path.join(root, "b"), { recursive: true });
    await writeFile(path.join(root, "a", "dup.jpg"), "a");
    await writeFile(path.join(root, "b", "dup.jpg"), "b");

    const index = await buildFileNameIndex(root);

    expect(index.get("dup.jpg")).toHaveLength(2);
  });

  it("does not match a name that is only a suffix of a stored file", async () => {
    await writeFile(path.join(root, "prefix-image.jpg"), "a");

    const index = await buildFileNameIndex(root);

    expect(index.get("image.jpg")).toBeUndefined();
  });

  it("rejects for a directory it cannot read, as the walk it replaced did", async () => {
    await expect(
      buildFileNameIndex(path.join(root, "does-not-exist")),
    ).rejects.toThrow();
  });

  it("orders duplicate names depth first, matching the previous walk", async () => {
    await mkdir(path.join(root, "aaa"), { recursive: true });
    await mkdir(path.join(root, "bbb"), { recursive: true });
    await writeFile(path.join(root, "aaa", "dup.jpg"), "a");
    await writeFile(path.join(root, "bbb", "dup.jpg"), "b");

    const index = await buildFileNameIndex(root);

    expect(index.get("dup.jpg")).toEqual([
      path.join(root, "aaa", "dup.jpg"),
      path.join(root, "bbb", "dup.jpg"),
    ]);
  });
});
