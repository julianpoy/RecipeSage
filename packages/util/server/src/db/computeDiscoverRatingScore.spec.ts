import { describe, it, expect } from "vitest";

import { computeDiscoverRatingScore } from "./computeDiscoverRatingScore";

describe("computeDiscoverRatingScore", () => {
  it("returns the prior when nobody rated the recipe", () => {
    expect(
      computeDiscoverRatingScore({ ratingAverage: 0, ratingCount: 0 }),
    ).toEqual(3.5);
  });

  it("pulls a single rating strongly toward the prior", () => {
    expect(
      computeDiscoverRatingScore({ ratingAverage: 5, ratingCount: 1 }),
    ).toBeCloseTo(3.75);
    expect(
      computeDiscoverRatingScore({ ratingAverage: 1, ratingCount: 1 }),
    ).toBeCloseTo(3.083);
  });

  it("follows the ratings more closely as more people rate", () => {
    const few = computeDiscoverRatingScore({
      ratingAverage: 5,
      ratingCount: 2,
    });
    const many = computeDiscoverRatingScore({
      ratingAverage: 5,
      ratingCount: 50,
    });

    expect(many).toBeGreaterThan(few);
    expect(many).toBeCloseTo(4.86, 1);
  });

  it("ranks a well rated recipe above one with a single top rating", () => {
    const wellRated = computeDiscoverRatingScore({
      ratingAverage: 4.5,
      ratingCount: 20,
    });
    const singleRating = computeDiscoverRatingScore({
      ratingAverage: 5,
      ratingCount: 1,
    });

    expect(wellRated).toBeGreaterThan(singleRating);
  });

  it("keeps values inside the rating scale", () => {
    expect(
      computeDiscoverRatingScore({ ratingAverage: 9, ratingCount: 4 }),
    ).toBeLessThanOrEqual(5);
    expect(
      computeDiscoverRatingScore({ ratingAverage: -2, ratingCount: 4 }),
    ).toBeGreaterThanOrEqual(1);
    expect(
      computeDiscoverRatingScore({ ratingAverage: 4, ratingCount: -3 }),
    ).toEqual(3.5);
  });
});
