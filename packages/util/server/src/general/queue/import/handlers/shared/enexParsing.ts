import { createReadStream } from "fs";

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export const PDF_MIME_TYPE = "application/pdf";

export const MAX_NOTE_BYTES = 20 * 1024 * 1024;

export interface XmlElement {
  type?: string;
  name?: string;
  text?: string;
  cdata?: string;
  attributes?: Record<string, string>;
  elements?: XmlElement[];
}

const BLOCK_TAGS = new Set([
  "div",
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "ul",
  "ol",
  "dl",
  "dt",
  "dd",
  "tr",
  "table",
  "tbody",
  "thead",
  "blockquote",
  "pre",
]);

export const extractText = (node: XmlElement | undefined): string => {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "cdata") return node.cdata || "";
  if (!node.elements) return "";

  let text = "";
  for (const child of node.elements) {
    const childText = extractText(child);
    const isBlock =
      child.type === "element" && !!child.name && BLOCK_TAGS.has(child.name);
    if (isBlock) {
      if (text && !text.endsWith("\n")) text += "\n";
      text += childText;
      if (childText && !text.endsWith("\n")) text += "\n";
    } else {
      text += childText;
    }
  }
  return text;
};

export const normalizeRecipeText = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length)
    .join("\n");

export const findChildren = (
  node: XmlElement | undefined,
  name: string,
): XmlElement[] => {
  if (!node?.elements) return [];
  return node.elements.filter(
    (el) => el.type === "element" && el.name === name,
  );
};

export const findChild = (
  node: XmlElement | undefined,
  name: string,
): XmlElement | undefined =>
  node?.elements?.find((el) => el.type === "element" && el.name === name);

export const elementText = (node: XmlElement | undefined): string => {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "cdata") return node.cdata || "";
  if (!node.elements) return "";
  return node.elements.map(elementText).join("");
};

/**
 * Yields the raw XML of each <note>...</note> in an ENEX file without parsing
 * the whole document into memory at once. Lets the caller stream notes from
 * huge exports (hundreds of MB) one at a time.
 */
export async function* streamNoteChunks(
  filePath: string,
): AsyncGenerator<string> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  let buffer = "";
  const startTag = "<note>";
  const endTag = "</note>";

  for await (const chunk of stream as AsyncIterable<string>) {
    buffer += chunk;
    while (true) {
      const start = buffer.indexOf(startTag);
      if (start === -1) {
        // The next chunk might begin with the rest of a <note> tag that
        // started in this one, so keep the last few characters around.
        if (buffer.length >= startTag.length) {
          buffer = buffer.slice(-(startTag.length - 1));
        }
        break;
      }
      const end = buffer.indexOf(endTag, start + startTag.length);
      if (end === -1) {
        if (start > 0) buffer = buffer.slice(start);
        break;
      }
      const noteXml = buffer.slice(start, end + endTag.length);
      buffer = buffer.slice(end + endTag.length);
      if (noteXml.length <= MAX_NOTE_BYTES) {
        yield noteXml;
      }
    }
  }
}

export async function countNoteChunks(filePath: string): Promise<number> {
  let count = 0;
  for await (const _ of streamNoteChunks(filePath)) {
    count++;
  }
  return count;
}
