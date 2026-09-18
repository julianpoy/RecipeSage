import { describe, it, expect } from "vitest";
import { getDocumentTitleFromFileName } from "./getDocumentTitleFromFileName";

describe("getDocumentTitleFromFileName", () => {
  it("uses the file name without the extension", () => {
    expect(getDocumentTitleFromFileName("Recipes/Banana Bread.md")).toEqual(
      "Banana Bread",
    );
  });

  it("removes a Notion page id", () => {
    expect(
      getDocumentTitleFromFileName(
        "Recipes/Banana Bread abc123def456789012345678abcdef01.md",
      ),
    ).toEqual("Banana Bread");
  });

  it("keeps a trailing word that is not a Notion page id", () => {
    expect(getDocumentTitleFromFileName("Soup 2.txt")).toEqual("Soup 2");
  });
});
