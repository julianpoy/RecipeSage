import { readdir } from "fs/promises";
import path from "path";

const indexDirectory = async (
  dirPath: string,
  index: Map<string, string[]>,
): Promise<void> => {
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await indexDirectory(fullPath, index);
    } else if (entry.isFile()) {
      const key = entry.name.toLowerCase();
      const existing = index.get(key);
      if (existing) existing.push(fullPath);
      else index.set(key, [fullPath]);
    }
  }
};

export async function buildFileNameIndex(
  dirPath: string,
): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  await indexDirectory(dirPath, index);
  return index;
}
