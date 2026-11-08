import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AbortError, FetchError, Response } from "node-fetch";
import { FetchTimeoutError } from "../FetchTimeoutError";
import { FetchURLError } from "../fetchURLError";
import { ClipFetchError } from "./ClipFetchError";
import { ClipTimeoutError } from "./ClipTimeoutError";
import { fetchClipPage } from "./fetchClipPage";

const fetchURLMock = vi.fn();

vi.mock("../fetch", () => ({
  fetchURL: (...args: unknown[]) => fetchURLMock(...args),
}));

const TARGET_URL = "https://example.com/recipe";

const pageHtml = (heading: string) => `<html><body>
  <h1>${heading}</h1>
  <p>${"This soup is a warm and simple meal for a cold day. ".repeat(12)}</p>
</body></html>`;

const DIRECT_HTML = pageHtml("Direct Soup");
const SCRAPFLY_HTML = pageHtml("Scrapfly Soup");
const SHORT_HTML = "<html><body><p>Access blocked</p></body></html>";

const htmlResponse = (html: string, status = 200) =>
  new Response(html, {
    status,
    headers: { "content-type": "text/html" },
  });

const scrapflyCalled = () =>
  fetchURLMock.mock.calls.some(([url]) =>
    String(url).startsWith("https://api.scrapfly.io/"),
  );

describe("fetchClipPage", () => {
  beforeEach(() => {
    fetchURLMock.mockReset();
    vi.stubEnv("SCRAPFLY_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the direct page without calling Scrapfly", async () => {
    fetchURLMock.mockResolvedValueOnce(htmlResponse(DIRECT_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: DIRECT_HTML });
    expect(fetchURLMock).toHaveBeenCalledOnce();
    expect(fetchURLMock.mock.calls[0][0]).toBe(TARGET_URL);
    expect(fetchURLMock.mock.calls[0][1].timeout).toBe(5000);
  });

  it("uses a direct PDF without calling Scrapfly", async () => {
    fetchURLMock.mockResolvedValueOnce(
      new Response("%PDF-1.4", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }),
    );

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "pdf", body: Buffer.from("%PDF-1.4") });
    expect(fetchURLMock).toHaveBeenCalledOnce();
  });

  it("falls back to Scrapfly when the direct fetch times out", async () => {
    fetchURLMock
      .mockRejectedValueOnce(new FetchTimeoutError(TARGET_URL))
      .mockResolvedValueOnce(htmlResponse(SCRAPFLY_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: SCRAPFLY_HTML });
    expect(scrapflyCalled()).toBe(true);
  });

  it("falls back to Scrapfly when the direct body read is aborted", async () => {
    const response = htmlResponse("");
    vi.spyOn(response, "text").mockRejectedValue(new AbortError("aborted"));
    fetchURLMock
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(htmlResponse(SCRAPFLY_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: SCRAPFLY_HTML });
  });

  it("falls back to Scrapfly on a direct network error", async () => {
    fetchURLMock
      .mockRejectedValueOnce(new FetchError("socket hang up", "system"))
      .mockResolvedValueOnce(htmlResponse(SCRAPFLY_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: SCRAPFLY_HTML });
  });

  it.each([401, 403, 404, 410, 429, 500, 503])(
    "falls back to Scrapfly on a direct %i",
    async (status) => {
      fetchURLMock
        .mockResolvedValueOnce(htmlResponse("Blocked", status))
        .mockResolvedValueOnce(htmlResponse(SCRAPFLY_HTML));

      const page = await fetchClipPage(TARGET_URL);

      expect(page).toEqual({ kind: "html", html: SCRAPFLY_HTML });
    },
  );

  it("does not call Scrapfly when the URL is blocked", async () => {
    fetchURLMock.mockRejectedValueOnce(new FetchURLError(TARGET_URL));

    await expect(fetchClipPage(TARGET_URL)).rejects.toBeInstanceOf(
      ClipFetchError,
    );
    expect(fetchURLMock).toHaveBeenCalledOnce();
  });

  it("falls back to Scrapfly on a direct bot challenge page", async () => {
    const challenge = `<html><head><title>Just a moment...</title></head><body>
      <p>${"Please wait while we check your browser. ".repeat(20)}</p>
    </body></html>`;
    fetchURLMock
      .mockResolvedValueOnce(htmlResponse(challenge))
      .mockResolvedValueOnce(htmlResponse(SCRAPFLY_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: SCRAPFLY_HTML });
  });

  it("falls back to Scrapfly on a short direct page", async () => {
    fetchURLMock
      .mockResolvedValueOnce(htmlResponse(SHORT_HTML))
      .mockResolvedValueOnce(htmlResponse(SCRAPFLY_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: SCRAPFLY_HTML });
  });

  it("throws ClipFetchError when Scrapfly fails after a short page", async () => {
    fetchURLMock
      .mockResolvedValueOnce(htmlResponse(SHORT_HTML))
      .mockResolvedValueOnce(htmlResponse("Error", 502));

    await expect(fetchClipPage(TARGET_URL)).rejects.toBeInstanceOf(
      ClipFetchError,
    );
  });

  it("throws ClipTimeoutError when Scrapfly times out after a direct failure", async () => {
    fetchURLMock
      .mockRejectedValueOnce(new FetchTimeoutError(TARGET_URL))
      .mockRejectedValueOnce(new FetchTimeoutError(TARGET_URL));

    await expect(fetchClipPage(TARGET_URL)).rejects.toBeInstanceOf(
      ClipTimeoutError,
    );
  });

  it("uses only the direct fetch with the longer timeout when no key is set", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "");
    fetchURLMock.mockResolvedValueOnce(htmlResponse(SHORT_HTML));

    const page = await fetchClipPage(TARGET_URL);

    expect(page).toEqual({ kind: "html", html: SHORT_HTML });
    expect(fetchURLMock).toHaveBeenCalledOnce();
    expect(fetchURLMock.mock.calls[0][1].timeout).toBe(30000);
  });

  it("does not fall back on a failed direct fetch when no key is set", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "");
    fetchURLMock.mockRejectedValueOnce(new FetchTimeoutError(TARGET_URL));

    await expect(fetchClipPage(TARGET_URL)).rejects.toBeInstanceOf(
      ClipTimeoutError,
    );
    expect(fetchURLMock).toHaveBeenCalledOnce();
  });

  it("throws ClipFetchError for a blocked URL when no key is set", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "");
    fetchURLMock.mockRejectedValueOnce(new FetchURLError(TARGET_URL));

    await expect(fetchClipPage(TARGET_URL)).rejects.toBeInstanceOf(
      ClipFetchError,
    );
  });
});
