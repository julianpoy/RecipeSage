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

    test("returns all capabilities disabled when not logged in", async () => {
      const response = await anonymousTrpc.users.getMyCapabilities();

      expect(response).toEqual({
        highResImages: false,
        multipleImages: false,
        expandablePreviews: false,
        assistantMoreMessages: false,
        moreUsageCredits: false,
      });
    });
  });
});
