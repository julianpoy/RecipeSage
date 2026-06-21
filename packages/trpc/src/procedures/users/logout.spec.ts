import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("logout", () => {
  describe("success", () => {
    test("deletes the caller's current session", async ({ trpc, session }) => {
      await trpc.users.logout();

      const remaining = await prisma.session.findUnique({
        where: { token: session.token },
      });
      expect(remaining).toEqual(null);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.logout()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
