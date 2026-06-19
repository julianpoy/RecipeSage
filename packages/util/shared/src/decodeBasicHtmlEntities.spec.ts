import { describe, it, expect } from "vitest";
import { decodeBasicHtmlEntities } from "./decodeBasicHtmlEntities";

describe("decodeBasicHtmlEntities", () => {
  it("decodes ampersands", () => {
    expect(decodeBasicHtmlEntities("salt &amp; pepper")).toBe("salt & pepper");
  });

  it("decodes less-than and greater-than", () => {
    expect(decodeBasicHtmlEntities("heat to &lt;100&gt;")).toBe(
      "heat to <100>",
    );
  });

  it("decodes ampersand last so escaped entities survive one pass", () => {
    expect(decodeBasicHtmlEntities("a &amp;lt; b")).toBe("a &lt; b");
  });

  it("leaves non-encoded text untouched", () => {
    expect(decodeBasicHtmlEntities("café crème — naïve")).toBe(
      "café crème — naïve",
    );
  });

  it("leaves unrelated entities untouched", () => {
    expect(decodeBasicHtmlEntities("&copy; &eacute; &quot;")).toBe(
      "&copy; &eacute; &quot;",
    );
  });

  it("returns an empty string unchanged", () => {
    expect(decodeBasicHtmlEntities("")).toBe("");
  });
});
