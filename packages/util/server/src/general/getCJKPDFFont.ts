import stcasc, { type StcascConverter } from "switch-chinese";

export const CJK_PDF_FONTS = {
  japanese: "NotoSansCJKjp",
  korean: "NotoSansCJKkr",
  simplifiedChinese: "NotoSansCJKsc",
  traditionalChinese: "NotoSansCJKtc",
} as const;

export type CJKPDFFont = (typeof CJK_PDF_FONTS)[keyof typeof CJK_PDF_FONTS];

const HANGUL_REGEX = /\p{Script=Hangul}/gu;
const KANA_REGEX = /[\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const HAN_REGEX = /\p{Script=Han}/gu;

const CHARACTERS_SHARED_BY_SIMPLIFIED_AND_TRADITIONAL = new Set(
  "台后里干松制于云谷丑准采舍夸朴吁郁虱",
);

let chineseConverter: StcascConverter | undefined;
const getChineseConverter = () => (chineseConverter ??= stcasc());

const getCJKPDFFontForLanguage = (language: string): CJKPDFFont => {
  const normalizedLanguage = language.toLowerCase();
  if (normalizedLanguage.startsWith("ja")) return CJK_PDF_FONTS.japanese;
  if (normalizedLanguage.startsWith("ko")) return CJK_PDF_FONTS.korean;
  if (
    normalizedLanguage.startsWith("zh-cn") ||
    normalizedLanguage.startsWith("zh-sg") ||
    normalizedLanguage.startsWith("zh-hans")
  ) {
    return CJK_PDF_FONTS.simplifiedChinese;
  }
  return CJK_PDF_FONTS.traditionalChinese;
};

export const getCJKPDFFont = (text: string, language: string): CJKPDFFont => {
  const hangulCount = text.match(HANGUL_REGEX)?.length ?? 0;
  const kanaCount = text.match(KANA_REGEX)?.length ?? 0;
  if (hangulCount > 0 || kanaCount > 0) {
    return hangulCount > kanaCount
      ? CJK_PDF_FONTS.korean
      : CJK_PDF_FONTS.japanese;
  }

  let traditionalCount = 0;
  let simplifiedCount = 0;
  for (const [character] of text.matchAll(HAN_REGEX)) {
    if (CHARACTERS_SHARED_BY_SIMPLIFIED_AND_TRADITIONAL.has(character)) {
      continue;
    }
    const converter = getChineseConverter();
    if (converter.simplized(character) !== character) traditionalCount++;
    if (converter.traditionalized(character) !== character) simplifiedCount++;
  }

  if (traditionalCount > simplifiedCount) {
    return CJK_PDF_FONTS.traditionalChinese;
  }
  if (simplifiedCount > traditionalCount) {
    return CJK_PDF_FONTS.simplifiedChinese;
  }
  return getCJKPDFFontForLanguage(language);
};
