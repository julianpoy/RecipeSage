import fs from "fs/promises";
import { join } from "path";

const loadedLanguageFileMap: Record<string, Record<string, string>> = {};

export const translate = async (lang: string, key: string): Promise<string> => {
  if (!loadedLanguageFileMap[lang]) {
    try {
      const path = join(
        __dirname,
        "../../../../frontend/src/assets/i18n/",
        `${key}.json`,
      );
      const frontendI18nFile = await fs.readFile(path, "utf8");

      loadedLanguageFileMap[lang] = JSON.parse(frontendI18nFile);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (e instanceof Error && (e as any).code === "ENOENT") {
        // Do nothing, we don't have language requested
      } else {
        throw e;
      }
    }
  }

  const translations = loadedLanguageFileMap[lang];

  return translations[key] || key;
};
