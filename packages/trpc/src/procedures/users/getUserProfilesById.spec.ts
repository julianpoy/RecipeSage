import { test, anonymousTrpc } from "../../testutils";

describe("getUserProfilesById", () => {
  describe("success", () => {
    test("returns profiles for the given ids", async ({
      trpc,
      user,
      user2,
    }) => {
      const response = await trpc.users.getUserProfilesById({
        ids: [user.id, user2.id],
      });

      const ids = response.map((profile) => profile.id).sort();
      expect(ids).toEqual([user.id, user2.id].sort());
    });

    test("returns an empty list when no ids match", async ({ trpc }) => {
      const response = await trpc.users.getUserProfilesById({
        ids: ["00000000-0c70-4718-aacc-05add19096b5"],
      });
      expect(response).toEqual([]);
    });

    test("works without an authenticated caller", async ({ user }) => {
      const response = await anonymousTrpc.users.getUserProfilesById({
        ids: [user.id],
      });
      expect(response[0].id).toEqual(user.id);
    });
  });
});
