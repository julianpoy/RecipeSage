import {
  computeDiscoverRatingScore,
  MIN_RATING,
  MAX_RATING,
} from "./computeDiscoverRatingScore";

const BASE_WEIGHT = 0.4;
const FRESHNESS_WEIGHT = 0.6;
const SAVE_WEIGHT = 0.1;
const IMAGE_WEIGHT = 0.05;
const FRESHNESS_TAU_MS = 7 * 24 * 60 * 60 * 1000;
const SAVES_FOR_HALF_POPULARITY = 5;
const UNSCORED_QUALITY_SCORE = 3;

export const MIN_QUALITY_SCORE = 1;
export const MAX_QUALITY_SCORE = 5;

export const computeDiscoverRankScore = (input: {
  createdAt: Date;
  saveCount: number;
  ratingAverage: number;
  ratingCount: number;
  qualityScore: number | null;
  hasImage: boolean;
  now?: Date;
}): number => {
  const now = input.now ?? new Date();
  const ageMs = Math.max(0, now.getTime() - input.createdAt.getTime());
  const saveCount = Math.max(0, input.saveCount);
  const qualityScore = Math.min(
    Math.max(input.qualityScore ?? UNSCORED_QUALITY_SCORE, MIN_QUALITY_SCORE),
    MAX_QUALITY_SCORE,
  );

  const freshness = Math.exp(-ageMs / FRESHNESS_TAU_MS);
  const popularity = saveCount / (saveCount + SAVES_FOR_HALF_POPULARITY);
  const quality =
    (qualityScore - MIN_QUALITY_SCORE) /
    (MAX_QUALITY_SCORE - MIN_QUALITY_SCORE);

  const ratingScore = computeDiscoverRatingScore({
    ratingAverage: input.ratingAverage,
    ratingCount: input.ratingCount,
  });
  const rating = (ratingScore - MIN_RATING) / (MAX_RATING - MIN_RATING);

  return (
    quality *
    rating *
    (BASE_WEIGHT +
      FRESHNESS_WEIGHT * freshness +
      SAVE_WEIGHT * popularity +
      (input.hasImage ? IMAGE_WEIGHT : 0))
  );
};
