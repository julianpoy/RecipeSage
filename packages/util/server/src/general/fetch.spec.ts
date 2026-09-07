import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchURL } from "./fetch";
import { FetchURLError } from "./fetchURLError";
import { config } from "./config";

vi.mock("./config", () => ({
  config: { api: { enablePrivateFetch: false } },
}));

describe("fetchURL", () => {
  afterEach(() => {
    config.api.enablePrivateFetch = false;
  });

  it("rejects non-http(s) protocols", () => {
    expect(() => fetchURL("ftp://example.com/file")).toThrow(FetchURLError);
    expect(() => fetchURL("file:///etc/passwd")).toThrow(FetchURLError);
  });

  it("blocks the cloud metadata address", async () => {
    await expect(
      fetchURL("http://169.254.169.254/latest/meta-data/", { timeout: 5000 }),
    ).rejects.toThrow(FetchURLError);
  });

  it("blocks private IP addresses", async () => {
    await expect(
      fetchURL("http://10.0.0.1/", { timeout: 5000 }),
    ).rejects.toThrow(FetchURLError);
  });

  it("blocks loopback addresses", async () => {
    await expect(
      fetchURL("http://127.0.0.1:1/", { timeout: 5000 }),
    ).rejects.toThrow(FetchURLError);
  });

  it("allows private addresses when private fetch is enabled", async () => {
    config.api.enablePrivateFetch = true;

    const error = await fetchURL("http://127.0.0.1:1/", {
      timeout: 5000,
    }).then(
      () => undefined,
      (e) => e,
    );

    expect(error).toBeDefined();
    expect(error).not.toBeInstanceOf(FetchURLError);
  });
});
