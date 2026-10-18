import { describe, it, expect, vi, afterEach } from "vitest";
import { getQueryParam, getQueryParams } from "./queryParams";

const withSearch = (search: string) => {
  vi.stubGlobal("window", { location: { search } });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getQueryParams", () => {
  it("returns an empty object when there is no query string", () => {
    withSearch("");
    expect(getQueryParams()).toEqual({});
  });

  it("reads a valueless param as an empty string", () => {
    withSearch("?a");
    expect(getQueryParams()).toEqual({ a: "" });
  });

  it("reads multiple params", () => {
    withSearch("?a=1&b=2");
    expect(getQueryParams()).toEqual({ a: "1", b: "2" });
  });

  it("keeps the last value when a key repeats", () => {
    withSearch("?a=1&a=2");
    expect(getQueryParams()).toEqual({ a: "2" });
  });

  it("decodes percent encoding", () => {
    withSearch("?a=b%20c");
    expect(getQueryParams()).toEqual({ a: "b c" });
  });

  it("decodes a plus as a space, which the share target relies on", () => {
    withSearch("?sharetarget-text=chicken+soup");
    expect(getQueryParams()).toEqual({ "sharetarget-text": "chicken soup" });
  });

  it("does not throw on a malformed percent escape", () => {
    withSearch("?a=%zz");
    expect(() => getQueryParams()).not.toThrow();
    expect(getQueryParams()).toEqual({ a: "%zz" });
  });

  it("keeps everything after the first equals sign", () => {
    withSearch("?a=b=c");
    expect(getQueryParams()).toEqual({ a: "b=c" });
  });
});

describe("getQueryParam", () => {
  it("returns the value of a present param", () => {
    withSearch("?token=abc123");
    expect(getQueryParam("token")).toEqual("abc123");
  });

  it("returns undefined for a missing param", () => {
    withSearch("?token=abc123");
    expect(getQueryParam("other")).toBeUndefined();
  });

  it("returns undefined when there is no query string", () => {
    withSearch("");
    expect(getQueryParam("token")).toBeUndefined();
  });

  it("returns an empty string for a valueless param", () => {
    withSearch("?token");
    expect(getQueryParam("token")).toEqual("");
  });
});
