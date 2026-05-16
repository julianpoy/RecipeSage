import { open as openZip } from "yauzl-promise";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join, dirname, relative, isAbsolute, sep } from "path";
import { pipeline } from "stream/promises";
import { Transform } from "stream";

const DEFAULT_MAX_TOTAL_UNCOMPRESSED_SIZE = 10 * 1024 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_UNCOMPRESSED_SIZE = 500 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_COUNT = 1000;

export class ZipTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipTooLargeError";
  }
}

export class ZipUnsafePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipUnsafePathError";
  }
}

export class ZipMalformedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipMalformedError";
  }
}

export interface SafeExtractZipOptions {
  maxEntryCount?: number;
  maxEntryUncompressedSize?: number;
  maxTotalUncompressedSize?: number;
}

const isPathOutsideDest = (extractDest: string, fullPath: string): boolean => {
  const rel = relative(extractDest, fullPath);
  if (rel === "" || rel === ".") return false;
  if (isAbsolute(rel)) return true;
  return rel.split(sep).includes("..");
};

export const safeExtractZip = async (
  zipPath: string,
  extractDest: string,
  options: SafeExtractZipOptions = {},
): Promise<void> => {
  const maxEntryCount = options.maxEntryCount ?? DEFAULT_MAX_ENTRY_COUNT;
  const maxEntryUncompressedSize =
    options.maxEntryUncompressedSize ?? DEFAULT_MAX_ENTRY_UNCOMPRESSED_SIZE;
  const maxTotalUncompressedSize =
    options.maxTotalUncompressedSize ?? DEFAULT_MAX_TOTAL_UNCOMPRESSED_SIZE;

  let entryCount = 0;
  let totalBytes = 0;

  let zip;
  try {
    zip = await openZip(zipPath);
  } catch (err) {
    throw new ZipMalformedError(
      err instanceof Error ? err.message : String(err),
    );
  }

  const iterator = zip[Symbol.asyncIterator]();
  try {
    while (true) {
      let next;
      try {
        next = await iterator.next();
      } catch (err) {
        throw new ZipMalformedError(
          err instanceof Error ? err.message : String(err),
        );
      }
      if (next.done) break;
      const entry = next.value;
      entryCount++;
      if (entryCount > maxEntryCount) {
        throw new ZipTooLargeError(
          `Zip contains more than ${maxEntryCount} entries`,
        );
      }

      if (entry.filename.startsWith("__MACOSX/")) continue;

      const fullPath = join(extractDest, entry.filename);
      if (isPathOutsideDest(extractDest, fullPath)) {
        throw new ZipUnsafePathError(
          `Zip entry "${entry.filename}" attempts to escape the extraction directory`,
        );
      }

      if (entry.filename.endsWith("/")) {
        await mkdir(fullPath, { recursive: true });
        continue;
      }

      if (entry.uncompressedSize > maxEntryUncompressedSize) {
        throw new ZipTooLargeError(
          `Zip entry "${entry.filename}" exceeds the per-entry size limit`,
        );
      }

      await mkdir(dirname(fullPath), { recursive: true });

      let entryBytes = 0;
      const counter = new Transform({
        transform(chunk, _encoding, callback) {
          entryBytes += chunk.length;
          totalBytes += chunk.length;
          if (entryBytes > maxEntryUncompressedSize) {
            callback(
              new ZipTooLargeError(
                `Zip entry "${entry.filename}" exceeds the per-entry size limit`,
              ),
            );
            return;
          }
          if (totalBytes > maxTotalUncompressedSize) {
            callback(
              new ZipTooLargeError(
                `Zip total uncompressed size exceeds the import limit`,
              ),
            );
            return;
          }
          callback(null, chunk);
        },
      });

      const readStream = await entry.openReadStream();
      const writeStream = createWriteStream(fullPath);
      await pipeline(readStream, counter, writeStream);
    }
  } finally {
    await zip.close();
  }
};
