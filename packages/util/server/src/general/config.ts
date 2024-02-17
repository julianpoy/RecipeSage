enum Environment {
  Prod = "production",
  Selfhost = "selfhost",
  Test = "test",
  Development = "development",
  All = "all",
}

const getEnvString = (name: string, requiredEnvironments: Environment[]) => {
  const value = process.env[name];

  const isRequired =
    requiredEnvironments.includes(
      (process.env.NODE_ENV || "production") as Environment,
    ) || requiredEnvironments.includes(Environment.All);
  if (!value && isRequired) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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
};
