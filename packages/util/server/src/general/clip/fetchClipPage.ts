import { AbortError } from "node-fetch";
import type { Response } from "node-fetch";
import { fetchURL } from "../fetch";
import { FetchTimeoutError } from "../FetchTimeoutError";
import { FetchURLError } from "../fetchURLError";
import { metrics } from "../metrics";
import { extractPageText } from "./htmlExtract";
import { isBotChallengePage } from "./isBotChallengePage";
import { ClipFetchError } from "./ClipFetchError";
import { ClipTimeoutError } from "./ClipTimeoutError";

const CLIP_DIRECT_FETCH_TIMEOUT_MS = 5000;
const CLIP_DIRECT_FETCH_MAX_BYTES = 25 * 1024 * 1024;
const CLIP_MIN_PAGE_TEXT_LENGTH = 500;

type ClipPage =
  | { kind: "pdf"; body: Buffer }
  | { kind: "image"; body: Buffer }
  | { kind: "html"; html: string };

type ClipFetchSource = "direct" | "scrapfly";

type DirectPageFallbackReason = "challenge" | "thin_page";

type ClipFetchOutcome =
  | "success"
  | "status"
  | "timeout"
  | "error"
  | "invalid_url"
  | DirectPageFallbackReason;

const recordClipFetchOutcome = (
  source: ClipFetchSource,
  outcome: ClipFetchOutcome,
) => metrics.clipFetch.inc({ source, outcome });

const recordClipFetchFailure = (
  source: ClipFetchSource,
  outcome: ClipFetchOutcome,
) => {
  recordClipFetchOutcome(source, outcome);
  metrics.clipError.inc({
    form: "url",
    method: "fetch",
  });
  return new ClipFetchError();
};

const readClipPage = async (response: Response): Promise<ClipPage> => {
  const contentType = response.headers.get("content-type");

  if (contentType === "application/pdf") {
    return { kind: "pdf", body: Buffer.from(await response.arrayBuffer()) };
  }

  if (contentType?.startsWith("image/")) {
    return { kind: "image", body: Buffer.from(await response.arrayBuffer()) };
  }

  return { kind: "html", html: await response.text() };
};

const isTimeoutError = (error: unknown): boolean =>
  error instanceof FetchTimeoutError || error instanceof AbortError;

const getDirectPageFallbackReason = (
  page: ClipPage,
): DirectPageFallbackReason | undefined => {
  if (page.kind !== "html") return undefined;
  if (isBotChallengePage(page.html)) return "challenge";
  if (extractPageText(page.html).text.length < CLIP_MIN_PAGE_TEXT_LENGTH) {
    return "thin_page";
  }
  return undefined;
};

const fetchUsableClipPageDirect = async (
  url: string,
): Promise<ClipPage | undefined> => {
  let page: ClipPage;
  try {
    const response = await fetchURL(url, {
      timeout: CLIP_DIRECT_FETCH_TIMEOUT_MS,
      requestConfig: {
        size: CLIP_DIRECT_FETCH_MAX_BYTES,
      },
    });
    if (!response.ok) {
      recordClipFetchOutcome("direct", "status");
      return undefined;
    }
    page = await readClipPage(response);
  } catch (e) {
    if (e instanceof FetchURLError) {
      throw recordClipFetchFailure("direct", "invalid_url");
    }
    recordClipFetchOutcome("direct", isTimeoutError(e) ? "timeout" : "error");
    return undefined;
  }

  const fallbackReason = getDirectPageFallbackReason(page);
  if (fallbackReason) {
    recordClipFetchOutcome("direct", fallbackReason);
    return undefined;
  }

  recordClipFetchOutcome("direct", "success");
  return page;
};

const fetchClipPageWithoutFallback = async (
  source: ClipFetchSource,
  url: string,
): Promise<ClipPage> => {
  const timeout = parseInt(
    process.env.CLIP_BROWSER_NAVIGATE_TIMEOUT || "30000",
  );

  let page: ClipPage | undefined;
  try {
    const response = await fetchURL(url, {
      timeout,
    });
    if (response.ok) page = await readClipPage(response);
  } catch (e) {
    if (isTimeoutError(e)) {
      recordClipFetchOutcome(source, "timeout");
      metrics.clipError.inc({
        form: "url",
        method: "timeout",
      });
      throw new ClipTimeoutError();
    }
    if (e instanceof FetchURLError) {
      throw recordClipFetchFailure(source, "invalid_url");
    }
    console.error(e);
    throw recordClipFetchFailure(source, "error");
  }

  if (!page) throw recordClipFetchFailure(source, "status");

  recordClipFetchOutcome(source, "success");
  return page;
};

export const fetchClipPage = async (url: string): Promise<ClipPage> => {
  const scrapflyKey = process.env.SCRAPFLY_API_KEY;
  if (!scrapflyKey) return fetchClipPageWithoutFallback("direct", url);

  const directPage = await fetchUsableClipPageDirect(url);
  if (directPage) return directPage;

  const params = new URLSearchParams({
    asp: "true",
    key: scrapflyKey,
    url,
    proxified_response: "true",
    lang: "en",
  });

  return fetchClipPageWithoutFallback(
    "scrapfly",
    `https://api.scrapfly.io/scrape?${params}`,
  );
};
