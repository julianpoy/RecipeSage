import path from "path";

export const findShallowestImportFile = (
  relativePaths: string[],
  isMatch: (relativePath: string) => boolean,
): string | undefined => {
  return relativePaths
    .filter(isMatch)
    .sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)[0];
};
