import fetch, { RequestInit } from "node-fetch";
import { useAgent } from "request-filtering-agent";
import { FetchURLError } from "./fetchURLError";

const normalizeFetchURL = (url: string): string =>
  url.startsWith("//") ? `https:${url}` : url;

const BLOCKED_ADDRESS_ERROR_FRAGMENT = "is not allowed";

const isBlockedAddressError = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes(BLOCKED_ADDRESS_ERROR_FRAGMENT);

export const fetchURL = (
  destURL: string,
  options?: {
    requestConfig?: Partial<RequestInit>;
    timeout?: number;
  },
) => {
  const normalizedURL = normalizeFetchURL(destURL);
  const parsedURL = URL.parse(normalizedURL);
  if (!parsedURL) {
    throw new FetchURLError(destURL);
  }

  if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") {
    throw new FetchURLError(destURL);
  }

  const fetchOpts: RequestInit = {
    method: "GET",
    signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    ...options?.requestConfig,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      ...options?.requestConfig?.headers,
    },
  };

  if (process.env.NODE_ENV !== "selfhost") {
    fetchOpts.agent = (parsedUrl) => useAgent(parsedUrl.href);
  }

  return fetch(normalizedURL, fetchOpts).catch((error) => {
    if (isBlockedAddressError(error)) {
      throw new FetchURLError(destURL);
    }
    throw error;
  });
};
