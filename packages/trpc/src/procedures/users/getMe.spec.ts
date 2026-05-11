import { test, anonymousTrpc } from "../../testutils";

describe("getMe", () => {
  describe("success", () => {
    test("returns the caller's profile", async ({ trpc, user }) => {
      const response = await trpc.users.getMe();

      expect(response.id).toEqual(user.id);
      expect(response.name).toEqual(user.name);
      expect(response.email).toEqual(user.email);
      expect(response.subscriptions).toEqual([]);
      expect(response.profileImages).toEqual([]);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getMe()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
