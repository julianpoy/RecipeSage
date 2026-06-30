import { test, anonymousTrpc, createActiveSubscription } from "../../testutils";

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
        discoverPublish: false,
      });
    });

    test("enables capabilities, including discoverPublish, for a contributor", async ({
      trpc,
      user,
    }) => {
      await createActiveSubscription(user.id);

      const response = await trpc.users.getMyCapabilities();

      expect(response.discoverPublish).toEqual(true);
      expect(response.multipleImages).toEqual(true);
    });

    test("returns all capabilities disabled when not logged in", async () => {
      const response = await anonymousTrpc.users.getMyCapabilities();

      expect(response).toEqual({
        highResImages: false,
        multipleImages: false,
        expandablePreviews: false,
        assistantMoreMessages: false,
        moreUsageCredits: false,
        discoverPublish: false,
      });
    });
  });
});
