import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir } from "fs/promises";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { once } from "events";
import ZipStream from "zip-stream";
import {
  safeExtractZip,
  ZipMalformedError,
  ZipTooLargeError,
  ZipTooManyEntriesError,
} from "./safeExtractZip";

const buildZip = async (
  zipPath: string,
  entries: { name: string; content: string | Buffer }[],
): Promise<void> => {
  const zip = new ZipStream();
  const out = createWriteStream(zipPath);
  zip.pipe(out);

  for (const { name, content } of entries) {
    await new Promise<void>((resolve, reject) => {
      zip.entry(
        typeof content === "string" ? Buffer.from(content) : content,
        { name },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }
  zip.finalize();
  await once(out, "close");
};

describe("safeExtractZip", () => {
  let workDir: string;
  let extractDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "safeExtractZip-spec-"));
    extractDir = join(workDir, "out");
    await mkdir(extractDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  describe("malformed input", () => {
    it("throws ZipMalformedError for a plain text file", async () => {
      const path = join(workDir, "not-a-zip.txt");
      await writeFile(path, "This is just plain text, definitely not a zip.");

      await expect(safeExtractZip(path, extractDir)).rejects.toBeInstanceOf(
        ZipMalformedError,
      );
    });

    it("throws ZipMalformedError for random binary garbage", async () => {
      const path = join(workDir, "garbage.zip");
      await writeFile(
        path,
        Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]),
      );

      await expect(safeExtractZip(path, extractDir)).rejects.toBeInstanceOf(
        ZipMalformedError,
      );
    });

    it("throws ZipMalformedError for an empty file", async () => {
      const path = join(workDir, "empty.zip");
      await writeFile(path, Buffer.alloc(0));

      await expect(safeExtractZip(path, extractDir)).rejects.toBeInstanceOf(
        ZipMalformedError,
      );
    });

    it("throws ZipMalformedError for a truncated zip (EOCD-shaped but invalid)", async () => {
      const path = join(workDir, "truncated.zip");
      const fake = Buffer.alloc(64);
      fake.writeUInt32LE(0x06054b50, 0);
      await writeFile(path, fake);

      await expect(safeExtractZip(path, extractDir)).rejects.toBeInstanceOf(
        ZipMalformedError,
      );
    });
  });

  describe("happy path", () => {
    it("extracts every entry and writes correct contents", async () => {
      const zipPath = join(workDir, "valid.zip");
      await buildZip(zipPath, [
        { name: "alpha.txt", content: "alpha contents" },
        { name: "nested/beta.txt", content: "beta contents" },
      ]);

      await safeExtractZip(zipPath, extractDir);

      const alpha = await readFile(join(extractDir, "alpha.txt"), "utf-8");
      const beta = await readFile(join(extractDir, "nested/beta.txt"), "utf-8");
      expect(alpha).toBe("alpha contents");
      expect(beta).toBe("beta contents");
    });

    it("skips __MACOSX/ entries silently", async () => {
      const zipPath = join(workDir, "with-macosx.zip");
      await buildZip(zipPath, [
        { name: "real.txt", content: "real contents" },
        { name: "__MACOSX/real.txt", content: "metadata garbage" },
        { name: "__MACOSX/._real.txt", content: "more metadata" },
      ]);

      await safeExtractZip(zipPath, extractDir);

      const entries = await readdir(extractDir);
      expect(entries).toEqual(["real.txt"]);
    });
  });

  describe("size and count limits", () => {
    it("throws ZipTooManyEntriesError when entry count exceeds maxEntryCount", async () => {
      const zipPath = join(workDir, "many.zip");
      await buildZip(zipPath, [
        { name: "a.txt", content: "a" },
        { name: "b.txt", content: "b" },
        { name: "c.txt", content: "c" },
      ]);

      await expect(
        safeExtractZip(zipPath, extractDir, { maxEntryCount: 2 }),
      ).rejects.toBeInstanceOf(ZipTooManyEntriesError);
    });

    it("throws ZipTooLargeError when a single entry exceeds maxEntryUncompressedSize", async () => {
      const zipPath = join(workDir, "big-entry.zip");
      await buildZip(zipPath, [
        { name: "small.txt", content: "ok" },
        { name: "big.txt", content: "x".repeat(2000) },
      ]);

      await expect(
        safeExtractZip(zipPath, extractDir, {
          maxEntryUncompressedSize: 100,
        }),
      ).rejects.toBeInstanceOf(ZipTooLargeError);
    });

    it("throws ZipTooLargeError when cumulative size exceeds maxTotalUncompressedSize", async () => {
      const zipPath = join(workDir, "big-total.zip");
      await buildZip(zipPath, [
        { name: "a.txt", content: "x".repeat(60) },
        { name: "b.txt", content: "x".repeat(60) },
      ]);

      await expect(
        safeExtractZip(zipPath, extractDir, {
          maxTotalUncompressedSize: 100,
        }),
      ).rejects.toBeInstanceOf(ZipTooLargeError);
    });
  });
});
