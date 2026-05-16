import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { getRecipeVisibilityQueryFilter } from "./getRecipeVisibilityQueryFilter";
import {
  userFactory,
  recipeFactory,
  labelFactory,
  friendshipFactory,
  profileItemFactory,
} from "../general/factories";

async function materialize(args: {
  userId?: string;
  userIds: string[];
  folder?: "main" | "inbox";
}): Promise<string[]> {
  const filters = await getRecipeVisibilityQueryFilter({
    userId: args.userId,
    userIds: args.userIds,
  });
  if (!filters.length) return [];
  const recipes = await prisma.recipe.findMany({
    where: {
      AND: [{ OR: filters }, { folder: args.folder ?? "main" }],
    },
    select: { id: true },
    orderBy: { title: "asc" },
  });
  return recipes.map((r) => r.id);
}

describe("getRecipeVisibilityQueryFilter (integration)", () => {
  let owner: User;
  let friendA: User;
  let friendB: User;
  let friendC: User;
  let stranger: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    owner = await prisma.user.create({ data: userFactory() });
    friendA = await prisma.user.create({ data: userFactory() });
    friendB = await prisma.user.create({ data: userFactory() });
    friendC = await prisma.user.create({ data: userFactory() });
    stranger = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(owner.id, friendA.id, friendB.id, friendC.id, stranger.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  describe("self only (no friendships)", () => {
    it("returns only the owner's recipes", async () => {
      const r1 = await prisma.recipe.create({
        data: { ...recipeFactory(owner.id), title: "a" },
      });
      const r2 = await prisma.recipe.create({
        data: { ...recipeFactory(owner.id), title: "b" },
      });
      await prisma.recipe.create({
        data: { ...recipeFactory(stranger.id), title: "c" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id],
      });
      expect(ids.sort()).toEqual([r1.id, r2.id].sort());
    });

    it("returns nothing when owner has no recipes", async () => {
      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id],
      });
      expect(ids).toEqual([]);
    });

    it("respects folder filter outside the visibility filter", async () => {
      const main = await prisma.recipe.create({
        data: { ...recipeFactory(owner.id), folder: "main", title: "m" },
      });
      await prisma.recipe.create({
        data: { ...recipeFactory(owner.id), folder: "inbox", title: "i" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id],
        folder: "main",
      });
      expect(ids).toEqual([main.id]);
    });
  });

  describe("friend with all-recipes share", () => {
    it("returns owner's recipes + all of friend's main recipes", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });

      const ownR = await prisma.recipe.create({
        data: { ...recipeFactory(owner.id), title: "own" },
      });
      const friendR1 = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "fA1" },
      });
      const friendR2 = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "fA2" },
      });
      const friendInbox = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), folder: "inbox", title: "fAi" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
        folder: "main",
      });
      expect(new Set(ids)).toEqual(
        new Set([ownR.id, friendR1.id, friendR2.id]),
      );
      expect(ids).not.toContain(friendInbox.id);
    });
  });

  describe("friend with label share", () => {
    it("returns only friend recipes with the shared label", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const sharedLabel = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const otherLabel = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: sharedLabel.id,
        }),
      });

      const matched = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "matched",
          recipeLabels: { create: [{ labelId: sharedLabel.id }] },
        },
      });
      const matchedBoth = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "both",
          recipeLabels: {
            create: [{ labelId: sharedLabel.id }, { labelId: otherLabel.id }],
          },
        },
      });
      const unmatched = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "unmatched",
          recipeLabels: { create: [{ labelId: otherLabel.id }] },
        },
      });
      const noLabels = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "nolabels" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
        folder: "main",
      });
      expect(new Set(ids)).toEqual(new Set([matched.id, matchedBoth.id]));
      expect(ids).not.toContain(unmatched.id);
      expect(ids).not.toContain(noLabels.id);
    });

    it("unions multiple shared labels for the same friend", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const labelX = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const labelY = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const labelZ = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: labelX.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: labelY.id,
        }),
      });

      const rX = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "rX",
          recipeLabels: { create: [{ labelId: labelX.id }] },
        },
      });
      const rY = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "rY",
          recipeLabels: { create: [{ labelId: labelY.id }] },
        },
      });
      const rZ = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "rZ",
          recipeLabels: { create: [{ labelId: labelZ.id }] },
        },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
      });
      expect(new Set(ids)).toEqual(new Set([rX.id, rY.id]));
      expect(ids).not.toContain(rZ.id);
    });

    it("does not include the same recipe twice when matched by multiple shared labels", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const labelX = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const labelY = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: labelX.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: labelY.id,
        }),
      });

      const rBoth = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "both",
          recipeLabels: {
            create: [{ labelId: labelX.id }, { labelId: labelY.id }],
          },
        },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
      });
      expect(ids.filter((id) => id === rBoth.id)).toHaveLength(1);
    });
  });

  describe("friend with recipe share", () => {
    it("returns only specifically shared recipes", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const sharedR = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "shared" },
      });
      const sharedR2 = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "shared2" },
      });
      const unshared = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "unshared" },
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: sharedR.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: sharedR2.id,
        }),
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
      });
      expect(new Set(ids)).toEqual(new Set([sharedR.id, sharedR2.id]));
      expect(ids).not.toContain(unshared.id);
    });
  });

  describe("friend with mixed share types", () => {
    it("unions label + recipe shares for the same friend", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const sharedLabel = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const sharedDirect = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "direct" },
      });
      const labeled = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "labeled",
          recipeLabels: { create: [{ labelId: sharedLabel.id }] },
        },
      });
      const unrelated = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "unrelated" },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: sharedLabel.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: sharedDirect.id,
        }),
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
      });
      expect(new Set(ids)).toEqual(new Set([labeled.id, sharedDirect.id]));
      expect(ids).not.toContain(unrelated.id);
    });

    it("all-recipes covers the friend even if redundant label/recipe items exist", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const someLabel = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const rA = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          title: "rA",
          recipeLabels: { create: [{ labelId: someLabel.id }] },
        },
      });
      const rB = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "rB" },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: someLabel.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: rB.id,
        }),
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
      });
      expect(new Set(ids)).toEqual(new Set([rA.id, rB.id]));
      expect(ids.filter((id) => id === rA.id)).toHaveLength(1);
      expect(ids.filter((id) => id === rB.id)).toHaveLength(1);
    });
  });

  describe("multiple friends with different share types", () => {
    it("merges visibility across all friends", async () => {
      await prisma.friendship.createMany({
        data: [
          ...friendshipFactory(owner.id, friendA.id),
          ...friendshipFactory(owner.id, friendB.id),
          ...friendshipFactory(owner.id, friendC.id),
        ],
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      const bLabel = await prisma.label.create({
        data: labelFactory(friendB.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendB.id,
          type: "label",
          visibility: "friends-only",
          labelId: bLabel.id,
        }),
      });
      const cRecipe = await prisma.recipe.create({
        data: { ...recipeFactory(friendC.id), title: "c-shared" },
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendC.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: cRecipe.id,
        }),
      });

      const own = await prisma.recipe.create({
        data: { ...recipeFactory(owner.id), title: "own" },
      });
      const aR1 = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "aR1" },
      });
      const aR2 = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "aR2" },
      });
      const bMatching = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendB.id),
          title: "bMatch",
          recipeLabels: { create: [{ labelId: bLabel.id }] },
        },
      });
      const bUnmatching = await prisma.recipe.create({
        data: { ...recipeFactory(friendB.id), title: "bUnmatch" },
      });
      const cOther = await prisma.recipe.create({
        data: { ...recipeFactory(friendC.id), title: "cOther" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id, friendB.id, friendC.id],
      });
      expect(new Set(ids)).toEqual(
        new Set([own.id, aR1.id, aR2.id, bMatching.id, cRecipe.id]),
      );
      expect(ids).not.toContain(bUnmatching.id);
      expect(ids).not.toContain(cOther.id);
    });
  });

  describe("non-friend visibility", () => {
    it("includes a non-friend's public profile item", async () => {
      const ownerProfileLabel = await prisma.label.create({
        data: labelFactory(stranger.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "label",
          visibility: "public",
          labelId: ownerProfileLabel.id,
        }),
      });

      const matched = await prisma.recipe.create({
        data: {
          ...recipeFactory(stranger.id),
          title: "pub",
          recipeLabels: { create: [{ labelId: ownerProfileLabel.id }] },
        },
      });
      const unmatched = await prisma.recipe.create({
        data: { ...recipeFactory(stranger.id), title: "private" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [stranger.id],
      });
      expect(ids).toEqual([matched.id]);
      expect(ids).not.toContain(unmatched.id);
    });

    it("excludes a non-friend's friends-only profile item", async () => {
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      await prisma.recipe.create({
        data: { ...recipeFactory(stranger.id), title: "hidden" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [stranger.id],
      });
      expect(ids).toEqual([]);
    });

    it("includes friends-only items when target IS a friend", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      const r = await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "visible" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [friendA.id],
      });
      expect(ids).toEqual([r.id]);
    });

    it("returns no rows for a friend that has no profile items", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      await prisma.recipe.create({
        data: { ...recipeFactory(friendA.id), title: "private" },
      });

      const ids = await materialize({
        userId: owner.id,
        userIds: [owner.id, friendA.id],
      });
      expect(ids).toEqual([]);
    });
  });

  describe("anonymous (no contextUserId)", () => {
    it("returns only public profile items for non-friend lookups", async () => {
      const pubLabel = await prisma.label.create({
        data: labelFactory(stranger.id),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "label",
          visibility: "public",
          labelId: pubLabel.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });

      const matched = await prisma.recipe.create({
        data: {
          ...recipeFactory(stranger.id),
          title: "pub",
          recipeLabels: { create: [{ labelId: pubLabel.id }] },
        },
      });
      const friendsOnly = await prisma.recipe.create({
        data: { ...recipeFactory(stranger.id), title: "fo" },
      });

      const ids = await materialize({
        userIds: [stranger.id],
      });
      expect(ids).toEqual([matched.id]);
      expect(ids).not.toContain(friendsOnly.id);
    });
  });

  describe("empty userIds", () => {
    it("returns an empty filter array", async () => {
      const filters = await getRecipeVisibilityQueryFilter({
        userId: owner.id,
        userIds: [],
      });
      expect(filters).toEqual([]);
    });
  });
});
