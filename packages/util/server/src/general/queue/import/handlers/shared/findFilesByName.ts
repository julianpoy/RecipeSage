import { readdir } from "fs/promises";
import path from "path";

export async function findFilesByName(
  dirPath: string,
  fileName: string,
): Promise<string[]> {
  const target = fileName.toLowerCase();
  const results: string[] = [];

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await findFilesByName(fullPath, fileName)));
    } else if (entry.isFile() && entry.name.toLowerCase() === target) {
      results.push(fullPath);
    }
  }

  return results;
}
