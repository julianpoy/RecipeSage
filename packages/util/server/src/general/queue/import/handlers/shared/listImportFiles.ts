import { readdir } from "fs/promises";
import path from "path";

export const listImportFiles = async (
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
    .filter(
      (relativePath) =>
        !relativePath
          .split(path.sep)
          .some((segment) => segment.startsWith(".")),
    )
    .sort();
};
