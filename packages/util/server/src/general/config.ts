enum Environment {
  Prod = "production",
  Selfhost = "selfhost",
  Test = "test",
  Development = "development",
  All = "all",
  AllRuntime = "all-runtime",
}

const getEnvString = <
  T extends
    | Exclude<Environment, Environment.All | Environment.AllRuntime>[]
    | Environment.All
    | Environment.AllRuntime,
  R extends T extends Environment.All ? string : string | undefined,
>(
  name: string,
  requiredEnvironments: T,
): R => {
  const value = process.env[name];

  let isRequired;
  if (requiredEnvironments === Environment.All) {
    isRequired = true;
  } else if (requiredEnvironments === Environment.AllRuntime) {
    isRequired = (process.env.NODE_ENV || "production") !== Environment.Test;
  } else {
    const _requiredEnvironments = requiredEnvironments as Environment[];
    const nodeEnv = process.env.NODE_ENV || "production";
    isRequired = _requiredEnvironments.includes(nodeEnv as Environment);
  }

  if (!value && isRequired) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value as R;
};

export const config = {
  api: {
    publicUrl: getEnvString("API_PUBLIC_BASE_URL", Environment.All),
  },
  google: {
    gsi: {
      clientId: getEnvString("GOOGLE_GSI_CLIENT_ID", [Environment.Prod]),
      clientSecret: getEnvString("GOOGLE_GSI_CLIENT_SECRET", [
        Environment.Prod,
      ]),
    },
  },
  grip: {
    url: getEnvString("GRIP_URL", Environment.All),
    key: getEnvString("GRIP_KEY", Environment.All),
  },
  ai: {
    provider:
      getEnvString("AI_PROVIDER", Environment.AllRuntime) || "openrouter",
    model: {
      webpage:
        getEnvString("AI_MODEL_WEBPAGE", Environment.AllRuntime) ||
        "google/gemini-2.5-flash-lite",
      text:
        getEnvString("AI_MODEL_TEXT", Environment.AllRuntime) ||
        "google/gemini-2.5-flash-lite",
      ocr:
        getEnvString("AI_MODEL_OCR", Environment.AllRuntime) ||
        "google/gemini-2.5-flash",
      document:
        getEnvString("AI_MODEL_DOCUMENT", Environment.AllRuntime) ||
        "google/gemini-2.5-flash",
      vision:
        getEnvString("AI_MODEL_VISION", Environment.AllRuntime) ||
        "anthropic/claude-sonnet-4.6",
      nutrition:
        getEnvString("AI_MODEL_NUTRITION", Environment.AllRuntime) ||
        "google/gemini-2.5-flash-lite",
      assistant:
        getEnvString("AI_MODEL_ASSISTANT", Environment.AllRuntime) ||
        "anthropic/claude-sonnet-4.6",
      assistantLow:
        getEnvString("AI_MODEL_ASSISTANT_LOW", Environment.AllRuntime) ||
        "google/gemini-2.5-flash",
    },
  },
};
