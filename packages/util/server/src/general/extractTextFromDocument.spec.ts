import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  extractTextFromDocument,
  ExtractTextFromDocumentError,
  UnsupportedDocumentFormatError,
} from "./extractTextFromDocument";

const captureException = vi.fn();

vi.mock("@sentry/node", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

describe("extractTextFromDocument", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "extractTextFromDocument-spec-"));
    captureException.mockClear();
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

  it("reports a failed docx read to Sentry", async () => {
    const path = join(workDir, "corrupt.docx");
    await writeFile(path, "not a zip file");

    await expect(extractTextFromDocument(path)).rejects.toBeInstanceOf(
      ExtractTextFromDocumentError,
    );
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("keeps only the title from html metadata", async () => {
    const path = join(workDir, "recipe.html");
    await writeFile(
      path,
      '<html><head><title>Best Pancakes</title><meta name="viewport" content="width=device-width"><meta name="generator" content="WordPress"></head><body><ul><li>2 cups flour</li></ul><p>Mix and cook.</p></body></html>',
    );

    const text = await extractTextFromDocument(path);
    expect(text).toContain("title: Best Pancakes");
    expect(text).not.toContain("viewport");
    expect(text).not.toContain("WordPress");
    expect(text).toContain("2 cups flour");
    expect(text).toContain("Mix and cook");
  });

  it("keeps only the title from rtf document properties", async () => {
    const path = join(workDir, "recipe.rtf");
    await writeFile(
      path,
      "{\\rtf1\\ansi{\\info{\\title Grandma Pancakes}{\\operator jsmith}{\\company Contoso}}\\pard 2 cups flour\\par Mix and cook.\\par}",
    );

    const text = await extractTextFromDocument(path);
    expect(text).toContain("title: Grandma Pancakes");
    expect(text).not.toContain("jsmith");
    expect(text).not.toContain("Contoso");
    expect(text).toContain("2 cups flour");
    expect(text).toContain("Mix and cook");
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
