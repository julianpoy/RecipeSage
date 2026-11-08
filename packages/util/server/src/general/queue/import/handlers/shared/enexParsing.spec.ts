import { describe, it, expect, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import xmljs from "xml-js";
import { MAX_IMAGES } from "../../../../../db/index";
import {
  elementText,
  extractText,
  findChild,
  findChildren,
  MAX_NOTE_BYTES,
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

const withTemporaryDirectory = async (
  prefix: string,
  fn: (directory: string) => Promise<void>,
) => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  try {
    await fn(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const withTempFile = (
  contents: string,
  fn: (filePath: string) => Promise<void>,
) =>
  withTemporaryDirectory("enex-spec-", async (directory) => {
    const filePath = path.join(directory, "file.enex");
    await writeFile(filePath, contents);
    await fn(filePath);
  });

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
        expect(chunks.map((chunk) => chunk.xml)).toEqual([
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
        expect(chunks[0].xml.length).toBe(`<note>${body}</note>`.length);
        expect(chunks[1].xml).toBe("<note>tail</note>");
      });
    });

    it("yields nothing for an ENEX with no notes", async () => {
      await withTempFile("<en-export></en-export>", async (filePath) => {
        expect(await collect(streamNoteChunks(filePath))).toEqual([]);
        expect(await countNoteChunks(filePath)).toBe(0);
      });
    });

    it("writes resource data to files and leaves it out of the note XML", async () => {
      const bytes = Buffer.from(
        Array.from({ length: 3000 }, (_, i) => i % 256),
      );
      const base64 = bytes.toString("base64").replace(/(.{76})/g, "$1\n");
      const enex = `<en-export><note><title>T</title><resource><data encoding="base64">${base64}</data><mime>image/png</mime></resource></note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks).toHaveLength(1);
            expect(chunks[0].xml).toBe(
              '<note><title>T</title><resource><data encoding="base64"></data><mime>image/png</mime></resource></note>',
            );
            expect(chunks[0].imagePaths).toHaveLength(1);
            expect(
              (await readFile(chunks[0].imagePaths[0])).equals(bytes),
            ).toBe(true);
          });
        },
      );
    });

    it("finds </data> when it straddles read-buffer boundaries", async () => {
      const bytes = Buffer.alloc(200 * 1024, 7);
      const enex = `<en-export><note><resource><data>${bytes.toString("base64")}</data><mime>application/pdf</mime></resource></note><note>tail</note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks).toHaveLength(2);
            expect(chunks[0].pdfPaths).toHaveLength(1);
            expect((await readFile(chunks[0].pdfPaths[0])).equals(bytes)).toBe(
              true,
            );
            expect(chunks[1].xml).toBe("<note>tail</note>");
          });
        },
      );
    });

    it("writes no files without a resource directory", async () => {
      const enex = `<en-export><note><resource><data>${Buffer.from("image").toString("base64")}</data><mime>image/png</mime><alternate-data>${Buffer.from("alt").toString("base64")}</alternate-data></resource></note></en-export>`;
      await withTempFile(enex, async (filePath) => {
        const chunks = await collect(streamNoteChunks(filePath));
        expect(chunks[0].xml).toBe(
          "<note><resource><data></data><mime>image/png</mime><alternate-data></alternate-data></resource></note>",
        );
        expect(chunks[0].imagePaths).toEqual([]);
        expect(await countNoteChunks(filePath)).toBe(1);
      });
    });

    it("removes files of resources that are not images or PDFs", async () => {
      const enex = `<en-export><note><resource><data>${Buffer.from("audio").toString("base64")}</data><mime>audio/wav</mime></resource></note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks[0].imagePaths).toEqual([]);
            expect(chunks[0].pdfPaths).toEqual([]);
            expect(await readdir(resourceDirectory)).toEqual([]);
          });
        },
      );
    });

    it("keeps at most MAX_IMAGES images and one PDF per note", async () => {
      const resource = (mime: string) =>
        `<resource><data>${Buffer.from(mime).toString("base64")}</data><mime>${mime}</mime></resource>`;
      const resources = [
        ...Array.from({ length: MAX_IMAGES + 5 }, () => resource("image/png")),
        resource("application/pdf"),
        resource("application/pdf"),
      ].join("");
      const enex = `<en-export><note>${resources}</note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks[0].imagePaths).toHaveLength(MAX_IMAGES);
            expect(chunks[0].pdfPaths).toHaveLength(1);
            expect(await readdir(resourceDirectory)).toHaveLength(
              MAX_IMAGES + 1,
            );
          });
        },
      );
    });

    it("treats a data tag without a closing bracket as note text", async () => {
      const unclosedText = "x".repeat(200 * 1024);
      const enex = `<en-export><note><resource><data ${unclosedText}</resource></note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks).toHaveLength(1);
            expect(chunks[0].xml).toBe(
              `<note><resource><data ${unclosedText}</resource></note>`,
            );
            expect(await readdir(resourceDirectory)).toEqual([]);
          });
        },
      );
    });

    it("ends resource data at the next tag when </data> is missing", async () => {
      const enex = `<en-export><note><resource><data>${Buffer.from("image").toString("base64")}<mime>image/png</mime></resource></note><note>next</note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks).toHaveLength(2);
            expect(chunks[0].imagePaths).toHaveLength(1);
            expect(chunks[1].xml).toBe("<note>next</note>");
          });
        },
      );
    });

    it("stops writing resource files after a fixed number per note", async () => {
      const audioResource = `<resource><data>${Buffer.from("audio").toString("base64")}</data><mime>audio/wav</mime></resource>`;
      const imageResource = `<resource><data>${Buffer.from("image").toString("base64")}</data><mime>image/png</mime></resource>`;
      const enex = `<en-export><note>${audioResource.repeat(100)}${imageResource}</note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory }),
            );
            expect(chunks[0].imagePaths).toEqual([]);
            expect(await readdir(resourceDirectory)).toEqual([]);
          });
        },
      );
    });

    it("keeps emoji whole across read-buffer boundaries", async () => {
      for (const prefix of ["", "a"]) {
        const text = `${prefix}${"😀".repeat(100 * 1024)}`;
        const enex = `<en-export><note><title>${text}</title></note></en-export>`;
        await withTempFile(enex, async (filePath) => {
          const chunks = await collect(streamNoteChunks(filePath));
          expect(chunks[0].xml).toBe(`<note><title>${text}</title></note>`);
        });
      }
    });

    it("yields notes whose resources are larger than MAX_NOTE_BYTES", async () => {
      const bytes = Buffer.alloc(MAX_NOTE_BYTES, 1);
      const enex = `<en-export><note><resource><data>${bytes.toString("base64")}</data><mime>image/jpeg</mime></resource></note></en-export>`;
      await withTemporaryDirectory(
        "enex-spec-resources-",
        async (resourceDirectory) => {
          await withTempFile(enex, async (filePath) => {
            const onSkippedNote = vi.fn();
            const chunks = await collect(
              streamNoteChunks(filePath, { resourceDirectory, onSkippedNote }),
            );
            expect(chunks).toHaveLength(1);
            expect(onSkippedNote).not.toHaveBeenCalled();
            expect(chunks[0].imagePaths).toHaveLength(1);
            expect((await readFile(chunks[0].imagePaths[0])).length).toBe(
              bytes.length,
            );
          });
        },
      );
    });
  });
});
