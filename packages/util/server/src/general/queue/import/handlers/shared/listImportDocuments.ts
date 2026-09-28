import path from "path";
import { isExtractableDocumentExtension } from "../../../../extractTextFromDocument";
import { isPlainTextDocumentExtension } from "./isPlainTextDocumentExtension";
import { listImportFiles } from "./listImportFiles";

const IGNORED_FILE_NAMES = ["archive_browser.html"];

export const listImportDocuments = async (
  extractPath: string,
): Promise<string[]> => {
  const relativePaths = await listImportFiles(extractPath);

  return relativePaths.filter((relativePath) => {
    if (IGNORED_FILE_NAMES.includes(path.basename(relativePath))) {
      return false;
    }

    const extension = path.extname(relativePath).toLowerCase();
    return (
      isPlainTextDocumentExtension(extension) ||
      isExtractableDocumentExtension(extension)
    );
  });
};
