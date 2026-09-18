import { describe, it, expect } from "vitest";
import { sanitizeRemoveHtmlToPlainText } from "./sanitizeRemoveHtmlToPlainText";

describe("sanitizeRemoveHtmlToPlainText", () => {
  it("keeps ampersands as plain characters", () => {
    expect(sanitizeRemoveHtmlToPlainText("Vegetables & Sausages")).toBe(
      "Vegetables & Sausages",
    );
  });

  it("decodes entities in already-sanitized input", () => {
    expect(sanitizeRemoveHtmlToPlainText("Vegetables &amp; Sausages")).toBe(
      "Vegetables & Sausages",
    );
  });

  it("keeps angle brackets and quotes as plain characters", () => {
    expect(sanitizeRemoveHtmlToPlainText(`1 < 2 > 0 "quoted" 'single'`)).toBe(
      `1 < 2 > 0 "quoted" 'single'`,
    );
  });

  it("removes html tags", () => {
    expect(
      sanitizeRemoveHtmlToPlainText("<b>Salt</b> &amp; <i>pepper</i>"),
    ).toBe("Salt & pepper");
  });

  it("removes script content", () => {
    expect(
      sanitizeRemoveHtmlToPlainText("Before<script>alert(1)</script>After"),
    ).toBe("BeforeAfter");
  });
});
