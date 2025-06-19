export const toCamelCase = (input: string) =>
  input
    .split(" ")
    .map((word, i) => {
      if (i === 0) return word.toLowerCase();

      return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    })
    .join("");
