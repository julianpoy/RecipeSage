import fetch, { RequestInit } from "node-fetch";
import * as url from "url";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";

const { CLIP_PROXY_URL, CLIP_PROXY_USERNAME, CLIP_PROXY_PASSWORD } =
  process.env;

// All domains must be whitelisted for security reasons
const FETCH_DOMAIN_ALLOWLIST = [
  "chefbook-dev.s3.amazonaws.com", // Dev S3
  "chefbook-dev.s3.us-west-2.amazonaws.com", // Dev S3
  "chefbook-prod.s3.amazonaws.com", // Prod S3
  "chefbook-prod.s3.us-west-2.amazonaws.com", // Prod S3
  "cdn2.pepperplate.com", // Pepperplate import
];
if (process.env.FETCH_DOMAIN_ALLOWLIST) {
  FETCH_DOMAIN_ALLOWLIST.push(...process.env.FETCH_DOMAIN_ALLOWLIST.split(","));
}

export const fetchURL = (
  destURL: string,
  options?: {
    requestConfig?: Partial<RequestInit>;
  }
) => {
  const fetchOpts: RequestInit = {
    method: "GET",
    ...options?.requestConfig,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:107.0) Gecko/20100101 Firefox/107.0",
      ...options?.requestConfig?.headers,
    },
  };

  const isAllowlisted = FETCH_DOMAIN_ALLOWLIST.includes(
    new URL(destURL).hostname
  );

  if (isAllowlisted || process.env.NODE_ENV === "selfhost") {
    return fetch(destURL, fetchOpts);
  }

  const isProxyEnabled = !!CLIP_PROXY_URL;
  if (!isProxyEnabled) {
    throw new Error("Domain not allowlisted and proxy not enabled");
  }

  const proxyUrl = url.parse(CLIP_PROXY_URL);
  if (CLIP_PROXY_PASSWORD && CLIP_PROXY_PASSWORD) {
    proxyUrl.auth = `${CLIP_PROXY_USERNAME}:${CLIP_PROXY_PASSWORD}`;
  }

  const proxyAgentConfig: HttpsProxyAgentOptions = {
    ...proxyUrl,
  };
  fetchOpts.agent = new HttpsProxyAgent(proxyAgentConfig);

  return fetch(destURL, fetchOpts);
};
