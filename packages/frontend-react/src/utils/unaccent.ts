const NON_DECOMPOSABLE: Record<string, string> = {
  ß: "ss",
  ẞ: "SS",
  ø: "o",
  Ø: "O",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  ð: "d",
  Ð: "D",
  þ: "th",
  Þ: "TH",
  ı: "i",
};

export const unaccent = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(
      /[ßẞøØæÆœŒłŁđĐðÐþÞı]/g,
      (character) => NON_DECOMPOSABLE[character] ?? character,
    );
