import fs from "fs/promises";
import { join } from "path";
import acceptLanguage from "accept-language";
import { SupportedLanguages } from "@recipesage/util/shared";
acceptLanguage.languages(Object.values(SupportedLanguages));

const loadedLanguageFileMap: Record<string, Record<string, string>> = {};

export const translate = async (
  acceptLanguageHeader: string,
  key: string,
): Promise<string> => {
  const lang = acceptLanguage.get(acceptLanguageHeader);
  if (!lang) return key;

  if (!loadedLanguageFileMap[lang]) {
    try {
      const path = join(
        __dirname,
        "../../../../frontend/src/assets/i18n/",
        `${lang}.json`,
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

  const translations = loadedLanguageFileMap[lang] || {};

  if (translations[key]) return translations[key];
  if (lang !== "en-us") return translate("en-us", key);
  return key;
};
