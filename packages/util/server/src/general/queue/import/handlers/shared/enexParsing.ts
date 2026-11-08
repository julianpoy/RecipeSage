import { createReadStream } from "fs";
import { open } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { MAX_IMAGES } from "../../../../../db/index";
import { deletePathsSilent } from "../../../../deletePathsSilent";
import { copyStringWithoutParentReference } from "./copyStringWithoutParentReference";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

const PDF_MIME_TYPE = "application/pdf";

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

export interface NoteChunk {
  xml: string;
  pdfPaths: string[];
  imagePaths: string[];
}

interface StreamNoteChunksOptions {
  resourceDirectory?: string;
  onSkippedNote?: () => void;
}

const NOTE_START_TAG = "<note>";
const NOTE_END_TAG = "</note>";
const RESOURCE_START_TAG = "<resource>";
const RESOURCE_END_TAG = "</resource>";
const DATA_TAG_PREFIX = "<data";
const ALTERNATE_DATA_TAG_PREFIX = "<alternate-data";
const MIME_START_TAG = "<mime>";
const MIME_END_TAG = "</mime>";

const MAX_TAG_LOOKAHEAD_LENGTH = 1024;
const MAX_PDFS_PER_NOTE = 1;
const MAX_RESOURCE_FILES_PER_NOTE = 50;

interface TagSearch {
  pattern: RegExp;
  partialTagLengthToKeep: number;
}

const createTagSearch = (tags: string[]): TagSearch => ({
  pattern: new RegExp(tags.map((tag) => RegExp.escape(tag)).join("|")),
  partialTagLengthToKeep: Math.max(...tags.map((tag) => tag.length)) - 1,
});

const TAGS_TO_FIND_IN_NOTE = createTagSearch([
  RESOURCE_START_TAG,
  NOTE_END_TAG,
]);
const TAGS_TO_FIND_IN_RESOURCE = createTagSearch([
  DATA_TAG_PREFIX,
  ALTERNATE_DATA_TAG_PREFIX,
  MIME_START_TAG,
  RESOURCE_END_TAG,
  NOTE_END_TAG,
]);

interface Base64FileWriter {
  filePath: string;
  write: (base64: string) => Promise<void>;
  closeAndGetBytesWritten: () => Promise<number>;
  closeWithoutFlushing: () => Promise<void>;
}

const openBase64FileWriter = async (
  filePath: string,
): Promise<Base64FileWriter> => {
  const handle = await open(filePath, "w");
  let remainder = "";
  let totalBytesWritten = 0;

  const writeBytes = async (base64: string) => {
    if (!base64) return;
    const bytes = Buffer.from(base64, "base64");
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesWritten } = await handle.write(bytes, offset);
      offset += bytesWritten;
    }
    totalBytesWritten += bytes.length;
  };

  return {
    filePath,
    write: async (base64) => {
      const text = remainder + base64.replace(/\s/g, "");
      const usableLength = text.length - (text.length % 4);
      remainder = text.slice(usableLength);
      await writeBytes(text.slice(0, usableLength));
    },
    closeAndGetBytesWritten: async () => {
      try {
        await writeBytes(remainder);
      } finally {
        remainder = "";
        await handle.close();
      }
      return totalBytesWritten;
    },
    closeWithoutFlushing: () => handle.close(),
  };
};

export async function* streamNoteChunks(
  filePath: string,
  options: StreamNoteChunksOptions = {},
): AsyncGenerator<NoteChunk> {
  const { resourceDirectory, onSkippedNote } = options;
  const stream = createReadStream(filePath, { encoding: "utf8" });

  let state: "outside" | "note" | "resource" | "data" = "outside";
  let buffer = "";

  let noteParts: string[] = [];
  let pendingNoteParts: string[] = [];
  let noteLength = 0;
  let noteOversized = false;
  let pdfPaths: string[] = [];
  let imagePaths: string[] = [];
  let resourceFilesOpenedCount = 0;

  let resourceFilePath: string | undefined;
  let resourceMime = "";

  let dataWriter: Base64FileWriter | undefined;
  let dataEndTag = "";

  const noteHasRoomForPdf = () => pdfPaths.length < MAX_PDFS_PER_NOTE;
  const noteHasRoomForImage = () => imagePaths.length < MAX_IMAGES;

  const discardNoteParts = () => {
    noteParts = [];
    pendingNoteParts = [];
  };

  const flushPendingNoteParts = () => {
    if (!pendingNoteParts.length) return;
    noteParts.push(copyStringWithoutParentReference(pendingNoteParts.join("")));
    pendingNoteParts = [];
  };

  const appendToNote = (text: string) => {
    if (noteOversized || !text) return;
    noteLength += text.length;
    if (noteLength > MAX_NOTE_BYTES) {
      noteOversized = true;
      discardNoteParts();
      return;
    }
    pendingNoteParts.push(text);
  };

  const appendBufferExceptTail = (partialTagLengthToKeep: number) => {
    if (buffer.length <= partialTagLengthToKeep) return;
    appendToNote(buffer.slice(0, buffer.length - partialTagLengthToKeep));
    buffer = buffer.slice(buffer.length - partialTagLengthToKeep);
  };

  const removeResourceFile = async () => {
    if (resourceFilePath) await deletePathsSilent([resourceFilePath]);
    resourceFilePath = undefined;
  };

  const finishDataElement = async () => {
    if (!dataWriter) return;
    const writer = dataWriter;
    dataWriter = undefined;
    const bytesWritten = await writer.closeAndGetBytesWritten();
    if (bytesWritten > 0) {
      resourceFilePath = writer.filePath;
    } else {
      await deletePathsSilent([writer.filePath]);
    }
  };

  const keepOrRemoveResourceFile = async () => {
    if (!resourceFilePath) return;
    if (resourceMime === PDF_MIME_TYPE && noteHasRoomForPdf()) {
      pdfPaths.push(resourceFilePath);
      resourceFilePath = undefined;
    } else if (IMAGE_MIME_TYPES.has(resourceMime) && noteHasRoomForImage()) {
      imagePaths.push(resourceFilePath);
      resourceFilePath = undefined;
    } else {
      await removeResourceFile();
    }
  };

  try {
    for await (const chunk of stream as AsyncIterable<string>) {
      flushPendingNoteParts();
      buffer += chunk;
      while (true) {
        if (state === "outside") {
          const start = buffer.indexOf(NOTE_START_TAG);
          if (start === -1) {
            // The next chunk might begin with the rest of a <note> tag that
            // started in this one, so keep the last few characters around.
            if (buffer.length >= NOTE_START_TAG.length) {
              buffer = buffer.slice(-(NOTE_START_TAG.length - 1));
            }
            break;
          }
          buffer = buffer.slice(start + NOTE_START_TAG.length);
          state = "note";
          discardNoteParts();
          noteLength = 0;
          noteOversized = false;
          pdfPaths = [];
          imagePaths = [];
          resourceFilesOpenedCount = 0;
          appendToNote(NOTE_START_TAG);
          continue;
        }

        if (state === "data") {
          const end = buffer.indexOf("<");
          if (end === -1) {
            await dataWriter?.write(buffer);
            buffer = "";
            break;
          }
          await dataWriter?.write(buffer.slice(0, end));
          buffer = buffer.slice(end);
          if (
            buffer.length < dataEndTag.length &&
            dataEndTag.startsWith(buffer)
          ) {
            break;
          }
          await finishDataElement();
          if (buffer.startsWith(dataEndTag)) {
            appendToNote(dataEndTag);
            buffer = buffer.slice(dataEndTag.length);
          }
          state = "resource";
          continue;
        }

        const tagSearch =
          state === "note" ? TAGS_TO_FIND_IN_NOTE : TAGS_TO_FIND_IN_RESOURCE;
        const match = tagSearch.pattern.exec(buffer);
        if (!match) {
          appendBufferExceptTail(tagSearch.partialTagLengthToKeep);
          break;
        }
        const tag = match[0];

        appendToNote(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index);

        if (tag === RESOURCE_START_TAG) {
          appendToNote(RESOURCE_START_TAG);
          buffer = buffer.slice(RESOURCE_START_TAG.length);
          resourceMime = "";
          state = "resource";
          continue;
        }

        if (tag === RESOURCE_END_TAG) {
          appendToNote(RESOURCE_END_TAG);
          buffer = buffer.slice(RESOURCE_END_TAG.length);
          await keepOrRemoveResourceFile();
          state = "note";
          continue;
        }

        if (tag === NOTE_END_TAG) {
          appendToNote(NOTE_END_TAG);
          buffer = buffer.slice(NOTE_END_TAG.length);
          await removeResourceFile();
          state = "outside";
          if (noteOversized) {
            await deletePathsSilent([...pdfPaths, ...imagePaths]);
            onSkippedNote?.();
          } else {
            flushPendingNoteParts();
            const xml = noteParts.join("");
            discardNoteParts();
            yield { xml, pdfPaths, imagePaths };
          }
          continue;
        }

        const lookahead = buffer.slice(0, MAX_TAG_LOOKAHEAD_LENGTH);

        if (tag === MIME_START_TAG) {
          const mimeEnd = lookahead.indexOf(MIME_END_TAG);
          if (mimeEnd === -1 && buffer.length < MAX_TAG_LOOKAHEAD_LENGTH) {
            break;
          }
          if (mimeEnd === -1) {
            appendToNote(MIME_START_TAG);
            buffer = buffer.slice(MIME_START_TAG.length);
            continue;
          }
          resourceMime = lookahead
            .slice(MIME_START_TAG.length, mimeEnd)
            .trim()
            .toLowerCase();
          appendToNote(lookahead.slice(0, mimeEnd + MIME_END_TAG.length));
          buffer = buffer.slice(mimeEnd + MIME_END_TAG.length);
          continue;
        }

        const openTagEnd = lookahead.indexOf(">", tag.length);
        if (openTagEnd === -1 && buffer.length < MAX_TAG_LOOKAHEAD_LENGTH) {
          break;
        }

        if (openTagEnd === -1) {
          appendToNote(tag);
          buffer = buffer.slice(tag.length);
          continue;
        }

        appendToNote(buffer.slice(0, openTagEnd + 1));
        buffer = buffer.slice(openTagEnd + 1);
        dataEndTag = `</${tag.slice(1)}>`;

        if (
          tag === DATA_TAG_PREFIX &&
          resourceDirectory &&
          !noteOversized &&
          (noteHasRoomForPdf() || noteHasRoomForImage()) &&
          resourceFilesOpenedCount < MAX_RESOURCE_FILES_PER_NOTE
        ) {
          resourceFilesOpenedCount++;
          dataWriter = await openBase64FileWriter(
            path.join(resourceDirectory, randomUUID()),
          );
        }
        state = "data";
      }
    }
  } finally {
    await dataWriter?.closeWithoutFlushing();
  }
}

export async function countNoteChunks(filePath: string): Promise<number> {
  let count = 0;
  for await (const _ of streamNoteChunks(filePath)) {
    count++;
  }
  return count;
}
