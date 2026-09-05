import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchURL } from "./fetch";
import { FetchURLError } from "./fetchURLError";

describe("fetchURL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("allows private addresses when self-hosting", async () => {
    vi.stubEnv("NODE_ENV", "selfhost");

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
