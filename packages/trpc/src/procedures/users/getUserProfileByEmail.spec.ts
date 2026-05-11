import { test, anonymousTrpc } from "../../testutils";

describe("getUserProfileByEmail", () => {
  describe("success", () => {
    test("returns the matching user profile", async ({ trpc, user2 }) => {
      const response = await trpc.users.getUserProfileByEmail({
        email: user2.email,
      });

      expect(response.id).toEqual(user2.id);
      expect(response.name).toEqual(user2.name);
    });

    test("matches the email case-insensitively", async ({ trpc, user2 }) => {
      const response = await trpc.users.getUserProfileByEmail({
        email: user2.email.toUpperCase(),
      });

      expect(response.id).toEqual(user2.id);
    });
  });

  describe("error", () => {
    test("throws when no user matches the email", async ({ trpc }) => {
      await expect(
        trpc.users.getUserProfileByEmail({
          email: "nobody@example.invalid",
        }),
      ).rejects.toThrow("No profile found with that email");
    });

    test("throws when the caller is not logged in", async ({ user }) => {
      await expect(
        anonymousTrpc.users.getUserProfileByEmail({ email: user.email }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
