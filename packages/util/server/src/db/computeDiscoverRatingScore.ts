export const MIN_RATING = 1;
export const MAX_RATING = 5;

const RATING_PRIOR_COUNT = 5;
const RATING_PRIOR_MEAN = 3.5;

export const computeDiscoverRatingScore = (input: {
  ratingAverage: number;
  ratingCount: number;
}): number => {
  const ratingCount = Math.max(0, input.ratingCount);
  if (!ratingCount) return RATING_PRIOR_MEAN;

  const ratingAverage = Math.min(
    Math.max(input.ratingAverage, MIN_RATING),
    MAX_RATING,
  );

  return (
    (RATING_PRIOR_COUNT * RATING_PRIOR_MEAN + ratingCount * ratingAverage) /
    (RATING_PRIOR_COUNT + ratingCount)
  );
};
