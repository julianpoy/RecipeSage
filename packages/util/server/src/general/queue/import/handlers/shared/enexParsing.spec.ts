import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import xmljs from "xml-js";
import {
  elementText,
  extractText,
  findChild,
  findChildren,
  normalizeRecipeText,
  streamNoteChunks,
  countNoteChunks,
  type XmlElement,
} from "./enexParsing";

const parse = (xml: string): XmlElement =>
  JSON.parse(xmljs.xml2json(xml, { compact: false })) as XmlElement;

const collect = async <T>(iter: AsyncIterable<T>): Promise<T[]> => {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
};

const withTempFile = async (
  contents: string,
  fn: (filePath: string) => Promise<void>,
) => {
  const dir = await mkdtemp(path.join(tmpdir(), "enex-spec-"));
  const filePath = path.join(dir, "file.enex");
  await writeFile(filePath, contents);
  try {
    await fn(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe("enexParsing", () => {
  describe("extractText", () => {
    it("walks nested list items in <ul> and <ol>", () => {
      const doc = parse(
        "<en-note><h3>Ingredients</h3><ul><li><div>a</div></li><li><div>b</div></li></ul></en-note>",
      );
      const root = findChild(doc, "en-note");
      expect(normalizeRecipeText(extractText(root))).toBe("Ingredients\na\nb");
    });

    it("preserves document order between mixed sibling tags", () => {
      const doc = parse(
        "<en-note><div>intro</div><h3>Ing</h3><div>item1</div><div>item2</div><h3>Steps</h3><div>step1</div></en-note>",
      );
      const root = findChild(doc, "en-note");
      expect(normalizeRecipeText(extractText(root))).toBe(
        "intro\nIng\nitem1\nitem2\nSteps\nstep1",
      );
    });

    it("flows inline elements together without breaking words", () => {
      const doc = parse(
        '<en-note><div>1/2 cup <a href="#">sourdough starter</a> 130 g</div></en-note>',
      );
      const root = findChild(doc, "en-note");
      expect(normalizeRecipeText(extractText(root))).toBe(
        "1/2 cup sourdough starter 130 g",
      );
    });

    it("returns empty string for undefined or empty nodes", () => {
      expect(extractText(undefined)).toBe("");
      expect(extractText({ elements: [] })).toBe("");
    });
  });

  describe("elementText", () => {
    it("recursively concatenates text content without structural newlines", () => {
      const doc = parse("<title>My <b>Bold</b> Title</title>");
      expect(elementText(findChild(doc, "title"))).toBe("My Bold Title");
    });

    it("returns CDATA content", () => {
      const doc = parse(
        "<content><![CDATA[<en-note>raw</en-note>]]></content>",
      );
      expect(elementText(findChild(doc, "content"))).toBe(
        "<en-note>raw</en-note>",
      );
    });

    it("returns empty string for missing nodes", () => {
      expect(elementText(undefined)).toBe("");
    });
  });

  describe("findChild / findChildren", () => {
    it("finds direct children by name", () => {
      const doc = parse(
        "<note><tag>a</tag><tag>b</tag><title>t</title></note>",
      );
      const note = findChild(doc, "note");
      expect(findChildren(note, "tag")).toHaveLength(2);
      expect(elementText(findChild(note, "title"))).toBe("t");
    });

    it("does not recurse into descendants", () => {
      const doc = parse("<note><wrapper><tag>nested</tag></wrapper></note>");
      expect(findChildren(findChild(doc, "note"), "tag")).toHaveLength(0);
    });
  });

  describe("normalizeRecipeText", () => {
    it("trims each line and drops empty ones", () => {
      expect(normalizeRecipeText("  a  \n\n  b\n   \nc")).toBe("a\nb\nc");
    });
  });

  describe("streamNoteChunks", () => {
    it("yields each <note> block from an ENEX file", async () => {
      const enex =
        '<?xml version="1.0"?><en-export><note>A</note><note>B</note><note>C</note></en-export>';
      await withTempFile(enex, async (filePath) => {
        const chunks = await collect(streamNoteChunks(filePath));
        expect(chunks).toEqual([
          "<note>A</note>",
          "<note>B</note>",
          "<note>C</note>",
        ]);
        expect(await countNoteChunks(filePath)).toBe(3);
      });
    });

    it("handles <note> tags straddling read-buffer boundaries", async () => {
      const body = "x".repeat(200 * 1024);
      const enex = `<en-export><note>${body}</note><note>tail</note></en-export>`;
      await withTempFile(enex, async (filePath) => {
        const chunks = await collect(streamNoteChunks(filePath));
        expect(chunks).toHaveLength(2);
        expect(chunks[0].length).toBe(`<note>${body}</note>`.length);
        expect(chunks[1]).toBe("<note>tail</note>");
      });
    });

    it("yields nothing for an ENEX with no notes", async () => {
      await withTempFile("<en-export></en-export>", async (filePath) => {
        expect(await collect(streamNoteChunks(filePath))).toEqual([]);
        expect(await countNoteChunks(filePath)).toBe(0);
      });
    });
  });
});
