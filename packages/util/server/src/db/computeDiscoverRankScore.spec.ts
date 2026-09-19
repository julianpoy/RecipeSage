import { describe, it, expect } from "vitest";

import { computeDiscoverRankScore } from "./computeDiscoverRankScore";

const now = new Date("2026-01-30T00:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const baseInput = {
  createdAt: daysAgo(30),
  saveCount: 0,
  ratingAverage: 0,
  ratingCount: 0,
  qualityScore: 3,
  hasImage: false,
  now,
};

describe("computeDiscoverRankScore", () => {
  it("ranks a higher quality recipe above a lower quality one", () => {
    const high = computeDiscoverRankScore({ ...baseInput, qualityScore: 5 });
    const low = computeDiscoverRankScore({ ...baseInput, qualityScore: 2 });

    expect(high).toBeGreaterThan(low);
  });

  it("puts an unusable recipe at the bottom no matter how fresh it is", () => {
    const unusable = computeDiscoverRankScore({
      ...baseInput,
      createdAt: now,
      saveCount: 50,
      hasImage: true,
      qualityScore: 1,
    });

    expect(unusable).toEqual(0);
  });

  it("treats an unscored recipe as middle quality", () => {
    const unscored = computeDiscoverRankScore({
      ...baseInput,
      qualityScore: null,
    });

    expect(unscored).toEqual(
      computeDiscoverRankScore({ ...baseInput, qualityScore: 3 }),
    );
  });

  it("gives a small boost for having an image", () => {
    const withImage = computeDiscoverRankScore({
      ...baseInput,
      hasImage: true,
    });
    const withoutImage = computeDiscoverRankScore(baseInput);

    expect(withImage).toBeGreaterThan(withoutImage);
  });

  it("keeps a new low quality recipe below an older high quality one", () => {
    const newLowQuality = computeDiscoverRankScore({
      ...baseInput,
      createdAt: now,
      qualityScore: 2,
    });
    const olderHighQuality = computeDiscoverRankScore({
      ...baseInput,
      createdAt: daysAgo(21),
      qualityScore: 5,
    });

    expect(olderHighQuality).toBeGreaterThan(newLowQuality);
  });

  it("ranks a new good recipe above a week old great one", () => {
    const newGood = computeDiscoverRankScore({
      ...baseInput,
      createdAt: now,
      qualityScore: 4,
    });
    const weekOldGreat = computeDiscoverRankScore({
      ...baseInput,
      createdAt: daysAgo(7),
      qualityScore: 5,
    });

    expect(newGood).toBeGreaterThan(weekOldGreat);
  });

  it("drops a new recipe with many poor ratings below a new unrated one of lower quality", () => {
    const poorlyRated = computeDiscoverRankScore({
      ...baseInput,
      createdAt: now,
      qualityScore: 5,
      ratingAverage: 1,
      ratingCount: 8,
    });
    const unrated = computeDiscoverRankScore({
      ...baseInput,
      createdAt: now,
      qualityScore: 3,
    });

    expect(poorlyRated).toBeLessThan(unrated);
  });

  it("lowers the score further with each poor rating", () => {
    const unrated = computeDiscoverRankScore(baseInput);
    const onePoorRating = computeDiscoverRankScore({
      ...baseInput,
      ratingAverage: 1,
      ratingCount: 1,
    });
    const twoPoorRatings = computeDiscoverRankScore({
      ...baseInput,
      ratingAverage: 1,
      ratingCount: 2,
    });
    const manyPoorRatings = computeDiscoverRankScore({
      ...baseInput,
      ratingAverage: 1,
      ratingCount: 6,
    });

    expect(onePoorRating).toBeLessThan(unrated);
    expect(twoPoorRatings).toBeLessThan(onePoorRating);
    expect(manyPoorRatings).toBeLessThan(twoPoorRatings);
  });

  it("rewards more saves with a diminishing return", () => {
    const none = computeDiscoverRankScore(baseInput);
    const few = computeDiscoverRankScore({ ...baseInput, saveCount: 5 });
    const many = computeDiscoverRankScore({ ...baseInput, saveCount: 50 });

    expect(few - none).toBeGreaterThan(many - few);
  });
});
