import { prisma } from "@recipesage/prisma";
import { createUser, test } from "../../testutils";

describe("getThreads", () => {
  describe("success", () => {
    test("returns one thread per other user with the latest message", async ({
      trpc,
      trpc2,
      user,
      user2,
    }) => {
      await trpc.messages.createMessage({
        to: user2.id,
        body: "First",
      });
      await trpc2.messages.createMessage({
        to: user.id,
        body: "Second",
      });

      const threads = await trpc.messages.getThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].otherUser.id).toEqual(user2.id);
      expect(threads[0].latestMessage?.body).toEqual("Second");
    });

    test("orders threads by most recent activity with the latest message per partner", async ({
      trpc,
      user2,
    }) => {
      const user3 = await createUser();
      try {
        await trpc.messages.createMessage({ to: user2.id, body: "older" });
        await trpc.messages.createMessage({ to: user3.id, body: "newer" });

        const threads = await trpc.messages.getThreads();

        expect(threads).toHaveLength(2);
        expect(threads[0].otherUser.id).toEqual(user3.id);
        expect(threads[0].latestMessage?.body).toEqual("newer");
        expect(threads[1].otherUser.id).toEqual(user2.id);
        expect(threads[1].latestMessage?.body).toEqual("older");
      } finally {
        await prisma.user.deleteMany({ where: { id: user3.id } });
      }
    });

    test("returns an empty array when there are no messages", async ({
      trpc,
    }) => {
      const threads = await trpc.messages.getThreads();

      expect(threads).toEqual([]);
    });
  });
});
