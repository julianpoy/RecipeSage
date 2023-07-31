import type { Config } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Must provide DATABASE_URL");
}

export default {
  schema: "./packages/drizzle/src/lib/schema.ts",
  out: "./packages/drizzle/src/lib/",
  driver: 'pg',
  dbCredentials: {
    connectionString,
  }
} satisfies Config;

