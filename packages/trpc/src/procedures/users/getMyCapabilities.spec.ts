import { test, anonymousTrpc } from "../../testutils";

describe("getMyCapabilities", () => {
  describe("success", () => {
    test("returns all capabilities disabled for a user with no subscription", async ({
      trpc,
    }) => {
      const response = await trpc.users.getMyCapabilities();

      expect(response).toEqual({
        highResImages: false,
        multipleImages: false,
        expandablePreviews: false,
        assistantMoreMessages: false,
        moreUsageCredits: false,
      });
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getMyCapabilities()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
