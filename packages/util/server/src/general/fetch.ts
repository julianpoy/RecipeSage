import fetch, { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { FetchURLError } from "./fetchURLError";

const { CLIP_PROXY_URL, CLIP_PROXY_USERNAME, CLIP_PROXY_PASSWORD } =
  process.env;

// All domains must be whitelisted for security reasons
const FETCH_DOMAIN_ALLOWLIST = [
  "chefbook-dev.s3.amazonaws.com", // Dev S3
  "chefbook-dev.s3.us-west-2.amazonaws.com", // Dev S3
  "chefbook-prod.s3.amazonaws.com", // Prod S3
  "chefbook-prod.s3.us-west-2.amazonaws.com", // Prod S3
  "cdn2.pepperplate.com", // Pepperplate import
  "api.scrapfly.io", // A supported scraping proxy option
];
if (process.env.FETCH_DOMAIN_ALLOWLIST) {
  FETCH_DOMAIN_ALLOWLIST.push(...process.env.FETCH_DOMAIN_ALLOWLIST.split(","));
}

const normalizeFetchURL = (url: string): string =>
  url.startsWith("//") ? `https:${url}` : url;

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

  const isAllowlisted = FETCH_DOMAIN_ALLOWLIST.includes(parsedURL.hostname);

  if (isAllowlisted || process.env.NODE_ENV === "selfhost") {
    return fetch(normalizedURL, fetchOpts);
  }

  const isProxyEnabled = !!CLIP_PROXY_URL;
  if (!isProxyEnabled) {
    throw new Error("Domain not allowlisted and proxy not enabled");
  }

  const proxyUrl = new URL(CLIP_PROXY_URL);
  if (CLIP_PROXY_USERNAME && CLIP_PROXY_PASSWORD) {
    proxyUrl.username = CLIP_PROXY_USERNAME;
    proxyUrl.password = CLIP_PROXY_PASSWORD;
  }

  fetchOpts.agent = new HttpsProxyAgent(proxyUrl);

  return fetch(normalizedURL, fetchOpts);
};
