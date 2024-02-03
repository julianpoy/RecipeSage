export const cleanLabelTitle = (labelTitle: string): string => {
  const cleanedTitle = (labelTitle || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, "");

  if (cleanedTitle === "unlabeled") return "un-labeled";

  return cleanedTitle;
};
