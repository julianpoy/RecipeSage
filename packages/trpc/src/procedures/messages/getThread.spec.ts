import { test } from "../../testutils";

describe("getThread", () => {
  describe("success", () => {
    test("returns the thread and messages exchanged with another user", async ({
      trpc,
      trpc2,
      user,
      user2,
    }) => {
      await trpc.messages.createMessage({
        to: user2.id,
        body: "Hi from user one",
      });
      await trpc2.messages.createMessage({
        to: user.id,
        body: "Hi back from user two",
      });

      const result = await trpc.messages.getThread({
        userId: user2.id,
      });

      expect(result.messageThread.otherUser.id).toEqual(user2.id);
      expect(result.messages).toHaveLength(2);
    });

    test("limits the number of returned messages", async ({ trpc, user2 }) => {
      await trpc.messages.createMessage({
        to: user2.id,
        body: "First",
      });
      await trpc.messages.createMessage({
        to: user2.id,
        body: "Second",
      });

      const result = await trpc.messages.getThread({
        userId: user2.id,
        messageLimit: 1,
      });

      expect(result.messages).toHaveLength(1);
    });

    test("returns an empty conversation when there are no messages", async ({
      trpc,
      user2,
    }) => {
      const result = await trpc.messages.getThread({
        userId: user2.id,
      });

      expect(result.messageThread.otherUser.id).toEqual(user2.id);
      expect(result.messageThread.latestMessage).toEqual(null);
      expect(result.messages).toEqual([]);
    });
  });

  describe("error", () => {
    test("throws when the other user does not exist", async ({ trpc }) => {
      await expect(
        trpc.messages.getThread({
          userId: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Could not find user under that ID.");
    });
  });
});
