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

  it("includes the pandoc error message when a docx file is missing", async () => {
    await expect(
      extractTextFromDocument(join(workDir, "missing.docx")),
    ).rejects.toThrow("does not exist");
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

  it("keeps text in docx Title, Subtitle, Author, Date, and Abstract styles", async () => {
    const text = await extractTextFromDocument(
      join(__dirname, "fixtures", "metadataStyles.docx"),
    );
    expect(text).toContain("Grandma Rose");
    expect(text).toContain("Pancakes");
    expect(text).toContain("Fluffy and quick");
    expect(text).toContain("Aunt May");
    expect(text).toContain("June 2020");
    expect(text).toContain("Best on Sundays");
    expect(text).toContain("2 cups flour");
    expect(text).toContain("Mix and cook");
  });

  it("keeps every markdown front matter field", async () => {
    const path = join(workDir, "recipe.md");
    await writeFile(
      path,
      "---\ntitle: Pancakes\nsubtitle: Fluffy and quick\nauthor:\n  - Aunt May\n  - name: Uncle Joe\nservings: 4\ntags: [breakfast, sweet]\n---\n\n- 2 cups flour\n\nMix and cook.\n",
    );

    const text = await extractTextFromDocument(path);
    expect(text).toContain("title: Pancakes");
    expect(text).toContain("subtitle: Fluffy and quick");
    expect(text).toContain("Aunt May");
    expect(text).toContain("Uncle Joe");
    expect(text).toContain("servings: 4");
    expect(text).toContain("tags: breakfast, sweet");
    expect(text).toContain("2 cups flour");
    expect(text).toContain("Mix and cook");
  });

  it("keeps the org title, author, and description", async () => {
    const path = join(workDir, "recipe.org");
    await writeFile(
      path,
      "#+TITLE: Pancakes\n#+AUTHOR: Aunt May\n#+DESCRIPTION: Sunday breakfast\n\n- 2 cups flour\n\nMix and cook.\n",
    );

    const text = await extractTextFromDocument(path);
    expect(text).toContain("title: Pancakes");
    expect(text).toContain("Aunt May");
    expect(text).toContain("Sunday breakfast");
    expect(text).toContain("2 cups flour");
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
