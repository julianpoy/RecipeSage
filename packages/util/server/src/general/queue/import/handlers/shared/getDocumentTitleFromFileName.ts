import path from "path";

const NOTION_PAGE_ID_SUFFIX = / [0-9a-f]{32}$/i;

export const getDocumentTitleFromFileName = (fileName: string): string => {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(NOTION_PAGE_ID_SUFFIX, "");
};
