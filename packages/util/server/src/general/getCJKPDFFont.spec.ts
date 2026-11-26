import { describe, it, expect } from "vitest";
import { CJK_PDF_FONTS, getCJKPDFFont } from "./getCJKPDFFont";

describe("getCJKPDFFont", () => {
  it("selects Traditional Chinese for traditional text", () => {
    expect(getCJKPDFFont("番茄炒蛋\n鹽少許，雞蛋三顆", "en-us")).toBe(
      CJK_PDF_FONTS.traditionalChinese,
    );
  });

  it("selects Simplified Chinese for simplified text", () => {
    expect(getCJKPDFFont("番茄炒蛋\n盐少许，鸡蛋三颗", "en-us")).toBe(
      CJK_PDF_FONTS.simplifiedChinese,
    );
  });

  it("does not count characters used in both forms as Simplified Chinese", () => {
    expect(getCJKPDFFont("后里米糕", "zh-hant")).toBe(
      CJK_PDF_FONTS.traditionalChinese,
    );
    expect(getCJKPDFFont("台南虱目魚粥", "zh-cn")).toBe(
      CJK_PDF_FONTS.traditionalChinese,
    );
    expect(getCJKPDFFont("台式干贝炒蛋", "zh-hant")).toBe(
      CJK_PDF_FONTS.simplifiedChinese,
    );
  });

  it("selects from the text before the language", () => {
    expect(getCJKPDFFont("盐少许，鸡蛋三颗", "zh-hant")).toBe(
      CJK_PDF_FONTS.simplifiedChinese,
    );
    expect(getCJKPDFFont("鹽少許，雞蛋三顆", "zh-cn")).toBe(
      CJK_PDF_FONTS.traditionalChinese,
    );
  });

  it("selects Japanese when the text has kana", () => {
    expect(getCJKPDFFont("親子丼\n鶏もも肉を切る", "en-us")).toBe(
      CJK_PDF_FONTS.japanese,
    );
  });

  it("selects Korean when the text has hangul", () => {
    expect(getCJKPDFFont("김치찌개\n김치를 볶는다", "en-us")).toBe(
      CJK_PDF_FONTS.korean,
    );
  });

  it.each([
    { language: "zh-cn", expected: CJK_PDF_FONTS.simplifiedChinese },
    { language: "zh-hant", expected: CJK_PDF_FONTS.traditionalChinese },
    { language: "ja", expected: CJK_PDF_FONTS.japanese },
    { language: "ko", expected: CJK_PDF_FONTS.korean },
    { language: "en-us", expected: CJK_PDF_FONTS.traditionalChinese },
  ])(
    "uses the language $language when the text does not show a variant",
    ({ language, expected }) => {
      expect(getCJKPDFFont("番茄炒蛋", language)).toBe(expected);
      expect(getCJKPDFFont("Tomato and eggs", language)).toBe(expected);
    },
  );
});
