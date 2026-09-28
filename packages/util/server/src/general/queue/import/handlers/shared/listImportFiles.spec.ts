import { describe, it, expect, afterEach } from "vitest";
import { mkdir, mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { listImportFiles } from "./listImportFiles";

describe("listImportFiles", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  const setup = async (files: string[]) => {
    const dir = await mkdtemp(path.join(tmpdir(), "import-files-"));
    temporaryDirectories.push(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "contents");
    }
    return dir;
  };

  it("finds files at the top level and in nested folders", async () => {
    const dir = await setup([
      "card.jpg",
      "Recipes/soup.pdf",
      "Recipes/Desserts/cake.png",
    ]);

    expect(await listImportFiles(dir)).toEqual([
      path.join("Recipes", "Desserts", "cake.png"),
      path.join("Recipes", "soup.pdf"),
      "card.jpg",
    ]);
  });

  it("skips hidden files and folders", async () => {
    const dir = await setup([
      "Recipes/._soup.pdf",
      "Recipes/.hidden/cake.png",
      "Recipes/soup.pdf",
    ]);

    expect(await listImportFiles(dir)).toEqual([
      path.join("Recipes", "soup.pdf"),
    ]);
  });

  it("does not list folders", async () => {
    const dir = await setup(["Recipes/soup.pdf"]);
    await mkdir(path.join(dir, "Empty"));

    expect(await listImportFiles(dir)).toEqual([
      path.join("Recipes", "soup.pdf"),
    ]);
  });
});
