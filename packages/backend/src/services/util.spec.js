import { expect } from "chai";

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
      expect(validatePassword("123456")).to.be.true;
    });

    it("returns false for short password", () => {
      expect(validatePassword("12345")).to.be.false;
    });

    it("returns false for null", () => {
      expect(validatePassword(null)).to.be.false;
    });

    it("returns false for undefined", () => {
      expect(validatePassword(undefined)).to.be.false;
    });
  });

  // Not a comprehensive test. Just gets a general idea for the matter
  describe("validateEmail", () => {
    it("returns true for valid emails", () => {
      expect(validateEmail("test@test.com")).to.be.true;
      expect(validateEmail("test@test.co")).to.be.true;
      expect(validateEmail("t@t.co")).to.be.true;
      expect(validateEmail("test.me@t.co")).to.be.true;
      expect(validateEmail("test+me@t.co")).to.be.true;
      expect(validateEmail("test-me@t.co")).to.be.true;
      expect(validateEmail("test-me@t.ca.rr")).to.be.true;
      expect(validateEmail("test-me@t.co.uk")).to.be.true;
    });

    it("returns false for invalid emails", () => {
      expect(validateEmail("")).to.be.false;
      expect(validateEmail("abc")).to.be.false;
      expect(validateEmail("@")).to.be.false;
      expect(validateEmail(".com")).to.be.false;
      expect(validateEmail("test@.com")).to.be.false;
      expect(validateEmail("abc@test")).to.be.false;
      expect(validateEmail("@test.com")).to.be.false;
      expect(validateEmail("com.@")).to.be.false;
      expect(validateEmail("te st@test.com")).to.be.false;
      expect(validateEmail("test @test.com")).to.be.false;
      expect(validateEmail("test@ test.com")).to.be.false;
      expect(validateEmail("test@te st.com")).to.be.false;
      expect(validateEmail("test@test .com")).to.be.false;
      expect(validateEmail("test@test. com")).to.be.false;
      expect(validateEmail("test@test.co m")).to.be.false;
    });
  });

  describe("sanitizeEmail", () => {
    it("removes spaces from either end", () => {
      expect(sanitizeEmail(" test@test.com ")).to.equal("test@test.com");
    });

    it("removes all capitalization", () => {
      expect(sanitizeEmail("tEsT@test.Com")).to.equal("test@test.com");
    });
  });

  describe("findFilesByRegex", () => {
    it("returns an array of file paths for test image img1.png", () => {
      let files = findFilesByRegex(
        path.join(__dirname, "../test/exampleFiles"),
        new RegExp(/img1\.png/, "i"),
      );

      expect(files[0].endsWith("test/exampleFiles/img1.png")).to.be.true;
    });

    it("returns an array of file paths for test image img1.png recursive", () => {
      let files = findFilesByRegex(
        path.join(__dirname, "../test"),
        new RegExp(/img1\.png/, "i"),
      );

      expect(files[0].endsWith("/test/exampleFiles/img1.png")).to.be.true;
    });

    it("returns empty array when it finds no files", () => {
      let files = findFilesByRegex(
        path.join(__dirname, "../test"),
        new RegExp("doesnotexist"),
      );

      expect(files).to.be.an("array");
      expect(files).to.have.length(0);
    });
  });
});
