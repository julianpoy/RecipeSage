import fs from "fs/promises";

export const deletePathsSilent = async (paths: string[]) => {
  for (const path of paths) {
    try {
      await fs.rm(path, { recursive: true });
    } catch (e) {
      console.error(e);
    }
  }
};
