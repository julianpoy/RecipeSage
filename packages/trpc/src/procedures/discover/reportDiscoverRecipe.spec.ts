import { prisma } from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

const { captureMessageMock } = vi.hoisted(() => ({
  captureMessageMock: vi.fn(),
}));

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return {
    ...actual,
    captureMessage: captureMessageMock,
  };
});

describe("reportDiscoverRecipe", () => {
  beforeEach(() => {
    captureMessageMock.mockClear();
  });

  describe("success", () => {
    test("logs a report from an anonymous viewer", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await anonymousTrpc.discover.reportDiscoverRecipe({
        id: recipe.id,
        reason: "This recipe is inappropriate",
      });
      expect(response.reported).toEqual(true);
      expect(captureMessageMock).toHaveBeenCalledWith(
        "Discover recipe reported",
        expect.objectContaining({
          tags: { discoverRecipeId: recipe.id },
        }),
      );
    });
  });

  describe("error", () => {
    test("throws when the recipe does not exist", async () => {
      await expect(
        anonymousTrpc.discover.reportDiscoverRecipe({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          reason: "This recipe is inappropriate",
        }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("rejects a reason shorter than five characters", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        anonymousTrpc.discover.reportDiscoverRecipe({
          id: recipe.id,
          reason: "no",
        }),
      ).rejects.toThrow();
    });
  });
});
