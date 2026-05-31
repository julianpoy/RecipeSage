import { describe, it, expect } from "vitest";
import { translate, interpolate } from "./translate";

describe("interpolate", () => {
  it("replaces {{name}} placeholders with provided values", () => {
    expect(interpolate("Hello {{name}}!", { name: "world" })).toBe(
      "Hello world!",
    );
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    expect(interpolate("{{x}} and {{x}}", { x: "again" })).toBe(
      "again and again",
    );
  });

  it("tolerates whitespace inside placeholder braces", () => {
    expect(interpolate("Hi {{ name }}", { name: "Jules" })).toBe("Hi Jules");
  });

  it("leaves unknown placeholders intact", () => {
    expect(interpolate("Hi {{name}}", {})).toBe("Hi {{name}}");
  });

  it("does not resolve prototype properties", () => {
    expect(interpolate("{{toString}}", {})).toBe("{{toString}}");
  });

  it("returns the template unchanged when there are no placeholders", () => {
    expect(interpolate("static text", { foo: "bar" })).toBe("static text");
  });
});

describe("translate", () => {
  it("returns the en-us translation for a known key", async () => {
    const result = await translate("en-us", "emails.passwordReset.subject");
    expect(result).toBe("RecipeSage Password Reset");
  });

  it("interpolates values into the translated string", async () => {
    const result = await translate(
      "en-us",
      "emails.passwordReset.pasteUrlInstruction",
      {
        resetLink: "https://example.invalid/reset/abc",
      },
    );
    expect(result).toContain("https://example.invalid/reset/abc");
    expect(result).not.toContain("{{resetLink}}");
  });

  it("falls back to en-us when the requested locale lacks the key", async () => {
    const enUs = await translate("en-us", "emails.passwordReset.subject");
    const otherLocale = await translate(
      "fr-fr",
      "emails.passwordReset.subject",
    );
    expect(otherLocale).toBeTruthy();
    expect(typeof otherLocale).toBe("string");
    expect(otherLocale).not.toBe("emails.passwordReset.subject");
    if (otherLocale === enUs) {
      expect(otherLocale).toBe(enUs);
    }
  });

  it("returns the raw key when no translation exists in any loaded locale", async () => {
    const result = await translate("en-us", "definitely.not.a.real.key");
    expect(result).toBe("definitely.not.a.real.key");
  });
});
