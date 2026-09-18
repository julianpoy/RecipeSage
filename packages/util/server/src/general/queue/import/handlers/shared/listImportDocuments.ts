import { readdir } from "fs/promises";
import path from "path";
import { isExtractableDocumentExtension } from "../../../../extractTextFromDocument";
import { isPlainTextDocumentExtension } from "./isPlainTextDocumentExtension";

const IGNORED_FILE_NAMES = ["archive_browser.html"];

export const listImportDocuments = async (
  extractPath: string,
): Promise<string[]> => {
  const entries = await readdir(extractPath, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(extractPath, path.join(entry.parentPath, entry.name)),
    )
    .filter((relativePath) => {
      const isHidden = relativePath
        .split(path.sep)
        .some((segment) => segment.startsWith("."));
      if (isHidden) return false;

      if (IGNORED_FILE_NAMES.includes(path.basename(relativePath))) {
        return false;
      }

      const extension = path.extname(relativePath).toLowerCase();
      return (
        isPlainTextDocumentExtension(extension) ||
        isExtractableDocumentExtension(extension)
      );
    })
    .sort();
};
