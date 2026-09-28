import { describe, it, expect } from "vitest";
import path from "path";
import { findShallowestImportFile } from "./findShallowestImportFile";

describe("findShallowestImportFile", () => {
  const isRecipesHtml = (relativePath: string) =>
    path.basename(relativePath) === "recipes.html";

  it("finds a matching file at the top level", () => {
    expect(
      findShallowestImportFile(["images/a.jpg", "recipes.html"], isRecipesHtml),
    ).toBe("recipes.html");
  });

  it("finds a matching file inside a folder", () => {
    const nestedPath = path.join("Export", "recipes.html");

    expect(
      findShallowestImportFile(
        [path.join("Export", "images", "a.jpg"), nestedPath],
        isRecipesHtml,
      ),
    ).toBe(nestedPath);
  });

  it("prefers the matching file closest to the top level", () => {
    const shallowPath = path.join("Export", "recipes.html");
    const deepPath = path.join("Export", "Old", "Backup", "recipes.html");

    expect(
      findShallowestImportFile([deepPath, shallowPath], isRecipesHtml),
    ).toBe(shallowPath);
  });

  it("returns undefined when no file matches", () => {
    expect(
      findShallowestImportFile(
        ["notes.txt", path.join("images", "a.jpg")],
        isRecipesHtml,
      ),
    ).toBeUndefined();
  });
});
