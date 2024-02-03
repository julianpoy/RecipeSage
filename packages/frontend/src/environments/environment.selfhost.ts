export const environment = {
  production: true,
};

export const IS_SELFHOST = true;

export const ENABLE_ANALYTICS = false;

export const STRIPE_PK = "";

export const API_BASE_URL = "api/";

// Selfhost requires some extra sniffing to determine base url for WS since
// ws can't be "relative" via just `grip/ws` like `api/` can.
const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
const path = window.location.pathname;
const extraSlash = path.endsWith("/") ? "" : "/";
export const GRIP_WS_URL = `${wsProto}//${window.location.host}${path}${extraSlash}grip/ws`;

export const SENTRY_SAMPLE_RATE = 0;

export const GOOGLE_GSI_CLIENT_ID = null;
