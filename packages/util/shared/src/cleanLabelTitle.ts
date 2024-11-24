export const cleanLabelTitle = (labelTitle: string): string => {
  const cleanedTitle = (labelTitle || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .substring(0, 255);

  if (cleanedTitle === "unlabeled") return "un-labeled";

  return cleanedTitle;
};
