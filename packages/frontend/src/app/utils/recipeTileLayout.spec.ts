import { describe, expect, it } from "vitest";
import { calculateRecipeTileLayout } from "./recipeTileLayout";

describe("calculateRecipeTileLayout", () => {
  it("uses two columns on recent Pro iPhones", () => {
    expect(calculateRecipeTileLayout(393)).toEqual({
      columnCount: 2,
      tileWidth: 181,
    });
    expect(calculateRecipeTileLayout(402)).toEqual({
      columnCount: 2,
      tileWidth: 186,
    });
  });

  it("keeps narrower screens single-column", () => {
    expect(calculateRecipeTileLayout(389)).toEqual({
      columnCount: 1,
      tileWidth: 200,
    });
  });

  it("uses 180 pixel tiles at the two-column breakpoint", () => {
    expect(calculateRecipeTileLayout(390)).toEqual({
      columnCount: 2,
      tileWidth: 180,
    });
  });

  it("preserves existing desktop column breakpoints", () => {
    expect(calculateRecipeTileLayout(659)).toEqual({
      columnCount: 2,
      tileWidth: 200,
    });
    expect(calculateRecipeTileLayout(660)).toEqual({
      columnCount: 3,
      tileWidth: 200,
    });
  });
});
