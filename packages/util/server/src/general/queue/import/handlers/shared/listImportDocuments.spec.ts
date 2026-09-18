import { describe, it, expect } from "vitest";
import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { listImportDocuments } from "./listImportDocuments";

describe("listImportDocuments", () => {
  const setup = async (files: string[]) => {
    const dir = await mkdtemp(path.join(tmpdir(), "import-documents-"));
    for (const file of files) {
      const filePath = path.join(dir, file);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "contents");
    }
    return dir;
  };

  it("finds documents at the top level", async () => {
    const dir = await setup(["recipe.txt", "other.docx"]);

    expect(await listImportDocuments(dir)).toEqual([
      "other.docx",
      "recipe.txt",
    ]);
  });

  it("finds documents in nested folders", async () => {
    const dir = await setup([
      "Takeout/Keep/Pancakes.html",
      "vault/Recipes/Soup.md",
    ]);

    expect(await listImportDocuments(dir)).toEqual([
      path.join("Takeout", "Keep", "Pancakes.html"),
      path.join("vault", "Recipes", "Soup.md"),
    ]);
  });

  it("skips hidden files and folders", async () => {
    const dir = await setup([
      "vault/.obsidian/workspace.md",
      "vault/.trash/Old.md",
      "vault/._Soup.md",
      "vault/Soup.md",
    ]);

    expect(await listImportDocuments(dir)).toEqual([
      path.join("vault", "Soup.md"),
    ]);
  });

  it("skips the Google Takeout archive browser", async () => {
    const dir = await setup([
      "Takeout/archive_browser.html",
      "Takeout/Keep/Pancakes.html",
    ]);

    expect(await listImportDocuments(dir)).toEqual([
      path.join("Takeout", "Keep", "Pancakes.html"),
    ]);
  });

  it("skips files that are not documents", async () => {
    const dir = await setup([
      "Keep/Pancakes.json",
      "Keep/Pancakes.png",
      "Keep/Pancakes.html",
    ]);

    expect(await listImportDocuments(dir)).toEqual([
      path.join("Keep", "Pancakes.html"),
    ]);
  });
});
