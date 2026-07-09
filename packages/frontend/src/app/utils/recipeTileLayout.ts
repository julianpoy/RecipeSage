export const RECIPE_TILE_MAX_WIDTH = 200;

const RECIPE_TILE_MIN_WIDTH = 180;
const RECIPE_TILE_GAP = 10;
const RECIPE_TILE_ROW_PADDING = 20;

export interface RecipeTileLayout {
  columnCount: number;
  tileWidth: number;
}

export function calculateRecipeTileLayout(pageWidth: number): RecipeTileLayout {
  const normalizedPageWidth = Math.max(pageWidth, 0);

  // Preserve existing desktop breakpoints while allowing two narrower tiles on phones.
  const defaultColumnCount = Math.max(
    Math.floor(
      normalizedPageWidth / (RECIPE_TILE_MAX_WIDTH + RECIPE_TILE_ROW_PADDING),
    ),
    1,
  );
  const canFitTwoColumns =
    normalizedPageWidth >=
    RECIPE_TILE_ROW_PADDING + RECIPE_TILE_MIN_WIDTH * 2 + RECIPE_TILE_GAP;
  const columnCount = Math.max(defaultColumnCount, canFitTwoColumns ? 2 : 1);

  if (columnCount === 1) {
    return {
      columnCount,
      tileWidth: RECIPE_TILE_MAX_WIDTH,
    };
  }

  const availableTileWidth =
    normalizedPageWidth -
    RECIPE_TILE_ROW_PADDING -
    RECIPE_TILE_GAP * (columnCount - 1);

  return {
    columnCount,
    tileWidth: Math.min(
      RECIPE_TILE_MAX_WIDTH,
      Math.floor(availableTileWidth / columnCount),
    ),
  };
}
