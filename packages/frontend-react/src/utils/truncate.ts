export const truncate = (str: string, maxLength: number) => {
  const ellipsis = "...";
  const trueMaxLength = maxLength - ellipsis.length;

  if (str.length <= trueMaxLength) return str;
  return `${str.substring(0, trueMaxLength)}${ellipsis}`;
};
