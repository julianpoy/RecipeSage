export const environment = {
  production: true,
};

export const IS_SELFHOST = true;
export const IS_DESKTOP = false;

export const ENABLE_ANALYTICS = false;

export const STRIPE_PK = "";

export const DEFAULT_API_BASE_URL = `${self.location.protocol}//${self.location.host}/api/`;
const wsProto = self.location.protocol === "https:" ? "wss:" : "ws:";
export const DEFAULT_GRIP_WS_URL = `${wsProto}//${self.location.host}/grip/ws`;

export const SENTRY_SAMPLE_RATE = 0;

export const GOOGLE_GSI_CLIENT_ID = null;

export const APPLE_SIGN_IN_SERVICES_ID = null;
