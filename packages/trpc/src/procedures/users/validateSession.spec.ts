import { test, anonymousTrpc } from "../../testutils";

describe("validateSession", () => {
  describe("success", () => {
    test("returns Valid when the caller is logged in", async ({ trpc }) => {
      const response = await trpc.users.validateSession();
      expect(response).toEqual("Valid");
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.validateSession()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
