import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, writeFile, access, rm } from "fs/promises";
import { join } from "path";
import { ObjectTypes } from "./shared";
import { deleteObjects } from "./filesystem";

const { storagePath } = vi.hoisted(() => {
  const storagePath = `/tmp/filesystem-spec-${Date.now()}`;
  process.env.FILESYSTEM_STORAGE_PATH = storagePath;
  return { storagePath };
});

describe("deleteObjects", () => {
  beforeEach(async () => {
    await mkdir(storagePath, { recursive: true });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await rm(storagePath, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("deletes the files and returns no failed keys", async () => {
    await writeFile(join(storagePath, "a"), "a");

    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, ["a"]);

    expect(failedKeys).toEqual([]);
    await expect(access(join(storagePath, "a"))).rejects.toThrow();
  });

  it("does not report a file that is already missing as failed", async () => {
    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, [
      "missing",
    ]);

    expect(failedKeys).toEqual([]);
  });

  it("returns the keys of files that could not be deleted", async () => {
    await writeFile(join(storagePath, "a"), "a");
    await mkdir(join(storagePath, "directory"));

    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, [
      "a",
      "directory",
    ]);

    expect(failedKeys).toEqual(["directory"]);
  });
});
