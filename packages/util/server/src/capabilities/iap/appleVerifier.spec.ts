import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyAppleTransaction } from "./appleVerifier";

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const transactionJws = (environment: string) =>
  [
    encode({ alg: "none" }),
    encode({
      bundleId: "com.recipesage.ios",
      environment,
      transactionId: "transaction-1",
    }),
    "signature",
  ].join(".");

describe("verifyAppleTransaction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["Xcode", "LocalTesting"])(
    "accepts %s transactions when test subscriptions are allowed",
    async (environment) => {
      await expect(
        verifyAppleTransaction(transactionJws(environment)),
      ).resolves.toMatchObject({ environment });
    },
  );

  it("rejects unsigned local transactions in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      verifyAppleTransaction(transactionJws("Xcode")),
    ).rejects.toBeDefined();
  });
});
