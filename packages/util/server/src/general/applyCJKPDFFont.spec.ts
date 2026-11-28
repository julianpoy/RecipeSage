import { describe, it, expect } from "vitest";
import { applyCJKPDFFont } from "./applyCJKPDFFont";

describe("applyCJKPDFFont", () => {
  const font = "NotoSansCJKtc";

  it("does not change text without CJK characters", () => {
    expect(applyCJKPDFFont("Tomato and eggs", font)).toBe("Tomato and eggs");
    expect(applyCJKPDFFont({ text: "Salt", bold: true }, font)).toEqual({
      text: "Salt",
      bold: true,
    });
  });

  it("gives the CJK font only to the CJK characters", () => {
    expect(applyCJKPDFFont("Tomato 番茄炒蛋。 eggs", font)).toEqual({
      text: ["Tomato ", { text: "番茄炒蛋。", font }, " eggs"],
    });
  });

  it("keeps the properties of the node", () => {
    expect(
      applyCJKPDFFont(
        { text: "鹽 1 tsp", bold: true, margin: [0, 10, 0, 0] },
        font,
      ),
    ).toEqual({
      text: [{ text: "鹽", font }, " 1 tsp"],
      bold: true,
      margin: [0, 10, 0, 0],
    });
  });

  it("keeps inline text flat and keeps the style of each inline", () => {
    expect(
      applyCJKPDFFont(
        {
          text: [
            { text: "1. ", bold: true },
            "Scramble the 雞蛋",
            { text: [{ text: "炒蛋 now", bold: true, link: "https://a.b" }] },
          ],
        },
        font,
      ),
    ).toEqual({
      text: [
        { text: "1. ", bold: true },
        "Scramble the ",
        { text: "雞蛋", font },
        {
          text: [
            { text: "炒蛋", bold: true, link: "https://a.b", font },
            { text: " now", bold: true, link: "https://a.b" },
          ],
        },
      ],
    });
  });

  it("applies to text inside stacks, columns, lists, and tables", () => {
    expect(
      applyCJKPDFFont(
        [
          { stack: ["鹽 1 tsp"] },
          { columns: [{ width: 100, text: "鹽" }] },
          { ul: ["鹽"] },
          { table: { body: [[{ text: "鹽", bold: true }, "1"]] } },
        ],
        font,
      ),
    ).toEqual([
      { stack: [{ text: [{ text: "鹽", font }, " 1 tsp"] }] },
      { columns: [{ width: 100, text: [{ text: "鹽", font }] }] },
      { ul: [{ text: [{ text: "鹽", font }] }] },
      {
        table: {
          body: [[{ text: [{ text: "鹽", font }], bold: true }, "1"]],
        },
      },
    ]);
  });

  it("applies to the table of contents title", () => {
    expect(applyCJKPDFFont({ toc: { title: { text: "目錄" } } }, font)).toEqual(
      { toc: { title: { text: [{ text: "目錄", font }] } } },
    );
  });
});
