import { describe, it, expect } from "vitest";
import { normalizeClipUrl } from "./normalizeClipUrl";

describe("normalizeClipUrl", () => {
  it("strips utm_* tracking parameters", () => {
    expect(
      normalizeClipUrl(
        "https://example.com/recipe?utm_source=newsletter&utm_medium=email",
      ),
    ).toBe("https://example.com/recipe");
  });

  it("strips known click identifier parameters", () => {
    expect(
      normalizeClipUrl("https://example.com/recipe?gclid=abc&fbclid=def"),
    ).toBe("https://example.com/recipe");
  });

  it("removes the fragment", () => {
    expect(normalizeClipUrl("https://example.com/recipe#jump-to-recipe")).toBe(
      "https://example.com/recipe",
    );
  });

  it("preserves content-bearing query parameters", () => {
    expect(normalizeClipUrl("https://example.com/view?id=123&print=1")).toBe(
      "https://example.com/view?id=123&print=1",
    );
  });

  it("keeps content parameters while dropping tracking ones", () => {
    expect(
      normalizeClipUrl(
        "https://example.com/view?id=123&utm_campaign=spring&fbclid=xyz",
      ),
    ).toBe("https://example.com/view?id=123");
  });

  it("sorts remaining parameters for a stable cache key", () => {
    expect(normalizeClipUrl("https://example.com/recipe?b=2&a=1")).toBe(
      normalizeClipUrl("https://example.com/recipe?a=1&b=2"),
    );
  });

  it("lowercases the host but preserves path casing", () => {
    expect(normalizeClipUrl("https://Example.COM/My-Recipe")).toBe(
      "https://example.com/My-Recipe",
    );
  });

  it("returns the trimmed input when the url cannot be parsed", () => {
    expect(normalizeClipUrl("  not a url  ")).toBe("not a url");
  });
});
