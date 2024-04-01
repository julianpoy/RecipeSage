enum Environment {
  Prod = "production",
  Selfhost = "selfhost",
  Test = "test",
  Development = "development",
  All = "all",
}

const getEnvString = <
  T extends Exclude<Environment, Environment.All>[] | Environment.All,
  R extends T extends Environment.All ? string : string | undefined,
>(
  name: string,
  requiredEnvironments: T,
): R => {
  const value = process.env[name];

  let isRequired;
  if (requiredEnvironments === Environment.All) {
    isRequired = true;
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
};
