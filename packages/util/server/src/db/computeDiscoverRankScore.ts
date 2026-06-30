const RECENCY_WEIGHT = 0.5;
const SAVE_WEIGHT = 0.3;
const RATING_WEIGHT = 0.2;
const RECENCY_TAU_MS = 14 * 24 * 60 * 60 * 1000;
const RATING_PRIOR_COUNT = 10;
const RATING_PRIOR_MEAN = 3.5;
const MAX_RATING = 5;

export const computeDiscoverRankScore = (input: {
  createdAt: Date;
  saveCount: number;
  ratingAverage: number;
  ratingCount: number;
  now?: Date;
}): number => {
  const now = input.now ?? new Date();
  const ageMs = Math.max(0, now.getTime() - input.createdAt.getTime());

  const recency = Math.exp(-ageMs / RECENCY_TAU_MS);
  const popularity = Math.log10(1 + Math.max(0, input.saveCount));
  const bayesianRating =
    (RATING_PRIOR_COUNT * RATING_PRIOR_MEAN +
      input.ratingCount * input.ratingAverage) /
    (RATING_PRIOR_COUNT + input.ratingCount);
  const quality = bayesianRating / MAX_RATING;

  return (
    RECENCY_WEIGHT * recency +
    SAVE_WEIGHT * popularity +
    RATING_WEIGHT * quality
  );
};
