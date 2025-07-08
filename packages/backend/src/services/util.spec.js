import path from "path";

import { setup, cleanup } from "../testutils.js";

import {
  validatePassword,
  validateEmail,
  sanitizeEmail,
  findFilesByRegex,
} from "../services/util.js";

describe("utils", () => {
  beforeAll(async () => {
    await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("validatePassword", () => {
    it("returns true for valid password", () => {
      expect(validatePassword("123456")).toBe(true);
    });

    it("returns false for short password", () => {
      expect(validatePassword("12345")).toBe(false);
    });

    it("returns false for null", () => {
      expect(validatePassword(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(validatePassword(undefined)).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("returns true for valid emails", () => {
      expect(validateEmail("test@test.com")).toBe(true);
      expect(validateEmail("test@test.co")).toBe(true);
      expect(validateEmail("t@t.co")).toBe(true);
      expect(validateEmail("test.me@t.co")).toBe(true);
      expect(validateEmail("test+me@t.co")).toBe(true);
      expect(validateEmail("test-me@t.co")).toBe(true);
      expect(validateEmail("test-me@t.ca.rr")).toBe(true);
      expect(validateEmail("test-me@t.co.uk")).toBe(true);
    });

    it("returns false for invalid emails", () => {
      expect(validateEmail("")).toBe(false);
      expect(validateEmail("abc")).toBe(false);
      expect(validateEmail("@")).toBe(false);
      expect(validateEmail(".com")).toBe(false);
      expect(validateEmail("test@.com")).toBe(false);
      expect(validateEmail("abc@test")).toBe(false);
      expect(validateEmail("@test.com")).toBe(false);
      expect(validateEmail("com.@")).toBe(false);
      expect(validateEmail("te st@test.com")).toBe(false);
      expect(validateEmail("test @test.com")).toBe(false);
      expect(validateEmail("test@ test.com")).toBe(false);
      expect(validateEmail("test@te st.com")).toBe(false);
      expect(validateEmail("test@test .com")).toBe(false);
      expect(validateEmail("test@test. com")).toBe(false);
      expect(validateEmail("test@test.co m")).toBe(false);
    });
  });

  describe("sanitizeEmail", () => {
    it("removes spaces from either end", () => {
      expect(sanitizeEmail(" test@test.com ")).toBe("test@test.com");
    });

    it("removes all capitalization", () => {
      expect(sanitizeEmail("tEsT@test.Com")).toBe("test@test.com");
    });
  });

  describe("findFilesByRegex", () => {
    it("returns an array of file paths for test image img1.png", () => {
      const files = findFilesByRegex(
        path.join(__dirname, "../test/exampleFiles"),
        new RegExp(/img1\.png/, "i"),
      );

      expect(files[0].endsWith("test/exampleFiles/img1.png")).toBe(true);
    });

    it("returns an array of file paths for test image img1.png recursive", () => {
      const files = findFilesByRegex(
        path.join(__dirname, "../test"),
        new RegExp(/img1\.png/, "i"),
      );

      expect(files[0].endsWith("/test/exampleFiles/img1.png")).toBe(true);
    });

    it("returns empty array when it finds no files", () => {
      const files = findFilesByRegex(
        path.join(__dirname, "../test"),
        new RegExp("doesnotexist"),
      );

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });
});
