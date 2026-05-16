import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  extractTextFromDocument,
  UnsupportedDocumentFormatError,
} from "./extractTextFromDocument";

describe("extractTextFromDocument", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "extractTextFromDocument-spec-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("rejects unsupported extensions", async () => {
    const path = join(workDir, "thing.txt");
    await writeFile(path, "plain text");

    await expect(extractTextFromDocument(path)).rejects.toBeInstanceOf(
      UnsupportedDocumentFormatError,
    );
  });

  it("extracts text from a markdown document via pandoc", async () => {
    const path = join(workDir, "recipe.md");
    await writeFile(
      path,
      "# Pancakes\n\n- 2 cups flour\n- 1 cup milk\n\nMix and cook.\n",
    );

    const text = await extractTextFromDocument(path);
    expect(text).toContain("Pancakes");
    expect(text).toContain("2 cups flour");
    expect(text).toContain("1 cup milk");
    expect(text).toContain("Mix and cook");
  });

  it("extracts text from an HTML document via pandoc", async () => {
    const path = join(workDir, "recipe.html");
    await writeFile(
      path,
      "<html><body><h1>Pancakes</h1><ul><li>2 cups flour</li><li>1 cup milk</li></ul><p>Mix and cook.</p></body></html>",
    );

    const text = await extractTextFromDocument(path);
    expect(text).toContain("Pancakes");
    expect(text).toContain("2 cups flour");
    expect(text).toContain("1 cup milk");
    expect(text).toContain("Mix and cook");
  });
});
