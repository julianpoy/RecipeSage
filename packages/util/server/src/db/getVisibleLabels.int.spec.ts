import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { getVisibleLabels } from "./getVisibleLabels";
import {
  userFactory,
  recipeFactory,
  labelFactory,
  friendshipFactory,
  profileItemFactory,
} from "../general/factories";

describe("getVisibleLabels (integration)", () => {
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

  describe("self only (includeSelf)", () => {
    it("returns only the context user's labels", async () => {
      const ownLabel = await prisma.label.create({
        data: labelFactory(owner.id),
      });
      await prisma.label.create({
        data: labelFactory(stranger.id),
      });

      const labels = await getVisibleLabels(owner.id, { includeSelf: true });
      expect(labels.map((l) => l.id)).toEqual([ownLabel.id]);
    });

    it("returns nothing when neither includeSelf nor includeAllFriends nor userIds is set", async () => {
      await prisma.label.create({ data: labelFactory(owner.id) });
      const labels = await getVisibleLabels(owner.id, {});
      expect(labels).toEqual([]);
    });

    it("returns own labels sorted by title asc", async () => {
      const lZ = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "Zebra" },
      });
      const lA = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "Apple" },
      });
      const lM = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "Mango" },
      });

      const labels = await getVisibleLabels(owner.id, { includeSelf: true });
      expect(labels.map((l) => l.id)).toEqual([lA.id, lM.id, lZ.id]);
    });
  });

  describe("friend with all-recipes share", () => {
    it("returns own + all friend's labels", async () => {
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

      const ownL = await prisma.label.create({
        data: labelFactory(owner.id),
      });
      const fL1 = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const fL2 = await prisma.label.create({
        data: labelFactory(friendA.id),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeSelf: true,
        includeAllFriends: true,
      });
      expect(new Set(labels.map((l) => l.id))).toEqual(
        new Set([ownL.id, fL1.id, fL2.id]),
      );
    });

    it("excludes a friend's labels when all-recipes is missing and only friends-only profile items exist for non-shared labels", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const fL1 = await prisma.label.create({
        data: labelFactory(friendA.id),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      expect(labels.map((l) => l.id)).not.toContain(fL1.id);
    });
  });

  describe("friend with label share (nested join semantics)", () => {
    it("returns the explicit shared label and labels co-attached to recipes with that label", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });

      const veg = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "veg" },
      });
      const ital = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "ital" },
      });
      const greek = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "greek" },
      });
      const lonely = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "lonely" },
      });

      // Recipe1: veg + ital → ital co-occurs with veg
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: {
            create: [{ labelId: veg.id }, { labelId: ital.id }],
          },
        },
      });
      // Recipe2: veg + greek → greek co-occurs with veg
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: {
            create: [{ labelId: veg.id }, { labelId: greek.id }],
          },
        },
      });
      // Recipe3: ital only — does NOT bring ital in by itself; ital is already in via Recipe1
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: ital.id }] },
        },
      });
      // Recipe4: lonely only — lonely never co-occurs with veg
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: lonely.id }] },
        },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: veg.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });

      const ids = new Set(labels.map((l) => l.id));
      expect(ids.has(veg.id)).toBe(true);
      expect(ids.has(ital.id)).toBe(true);
      expect(ids.has(greek.id)).toBe(true);
      expect(ids.has(lonely.id)).toBe(false);
    });

    it("does not duplicate a label that matches multiple OR clauses", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const lA = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const lB = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      // co-occur lA and lB
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: lA.id }, { labelId: lB.id }] },
        },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: lA.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: lB.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      const ids = labels.map((l) => l.id);
      expect(ids.filter((id) => id === lA.id)).toHaveLength(1);
      expect(ids.filter((id) => id === lB.id)).toHaveLength(1);
    });

    it("returns no co-occurring labels when shared label is on no recipes", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const orphan = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const other = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: other.id }] },
        },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: orphan.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      const ids = new Set(labels.map((l) => l.id));
      expect(ids.has(orphan.id)).toBe(true);
      expect(ids.has(other.id)).toBe(false);
    });
  });

  describe("friend with recipe share", () => {
    it("returns labels attached to the shared recipe (and only those)", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const lA = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const lB = await prisma.label.create({
        data: labelFactory(friendA.id),
      });
      const lC = await prisma.label.create({
        data: labelFactory(friendA.id),
      });

      const sharedRecipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: lA.id }, { labelId: lB.id }] },
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: lC.id }] },
        },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: sharedRecipe.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      const ids = new Set(labels.map((l) => l.id));
      expect(ids.has(lA.id)).toBe(true);
      expect(ids.has(lB.id)).toBe(true);
      expect(ids.has(lC.id)).toBe(false);
    });
  });

  describe("friend with mixed shares", () => {
    it("unions explicit label + co-attached + shared-recipe labels", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const veg = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "veg" },
      });
      const ital = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "ital" },
      });
      const dessert = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "dessert" },
      });
      const unrelated = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "unrelated" },
      });

      // veg + ital co-occur
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: {
            create: [{ labelId: veg.id }, { labelId: ital.id }],
          },
        },
      });

      const sharedRecipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: dessert.id }] },
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: unrelated.id }] },
        },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "label",
          visibility: "friends-only",
          labelId: veg.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: sharedRecipe.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      const ids = new Set(labels.map((l) => l.id));
      expect(ids.has(veg.id)).toBe(true);
      expect(ids.has(ital.id)).toBe(true);
      expect(ids.has(dessert.id)).toBe(true);
      expect(ids.has(unrelated.id)).toBe(false);
    });

    it("all-recipes covers the friend even with redundant label/recipe items", async () => {
      await prisma.friendship.createMany({
        data: friendshipFactory(owner.id, friendA.id),
      });
      const lA = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "a" },
      });
      const lB = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "b" },
      });
      const lC = await prisma.label.create({
        data: { ...labelFactory(friendA.id), title: "c" },
      });

      const sharedRecipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendA.id),
          recipeLabels: { create: [{ labelId: lA.id }] },
        },
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
          labelId: lA.id,
        }),
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: sharedRecipe.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      const ids = labels.map((l) => l.id);
      expect(new Set(ids)).toEqual(new Set([lA.id, lB.id, lC.id]));
      expect(ids.filter((id) => id === lA.id)).toHaveLength(1);
    });
  });

  describe("multiple friends with different share types", () => {
    it("merges labels across friends per share type", async () => {
      await prisma.friendship.createMany({
        data: [
          ...friendshipFactory(owner.id, friendA.id),
          ...friendshipFactory(owner.id, friendB.id),
          ...friendshipFactory(owner.id, friendC.id),
        ],
      });

      // friendA: all-recipes
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendA.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      const aL1 = await prisma.label.create({ data: labelFactory(friendA.id) });
      const aL2 = await prisma.label.create({ data: labelFactory(friendA.id) });

      // friendB: label share with co-occurrence
      const bShared = await prisma.label.create({
        data: { ...labelFactory(friendB.id), title: "bshared" },
      });
      const bCo = await prisma.label.create({
        data: { ...labelFactory(friendB.id), title: "bco" },
      });
      const bUnrelated = await prisma.label.create({
        data: { ...labelFactory(friendB.id), title: "bunrelated" },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendB.id),
          recipeLabels: {
            create: [{ labelId: bShared.id }, { labelId: bCo.id }],
          },
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendB.id),
          recipeLabels: { create: [{ labelId: bUnrelated.id }] },
        },
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendB.id,
          type: "label",
          visibility: "friends-only",
          labelId: bShared.id,
        }),
      });

      // friendC: recipe share
      const cAttached = await prisma.label.create({
        data: { ...labelFactory(friendC.id), title: "cattached" },
      });
      const cOther = await prisma.label.create({
        data: { ...labelFactory(friendC.id), title: "cother" },
      });
      const cRecipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(friendC.id),
          recipeLabels: { create: [{ labelId: cAttached.id }] },
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(friendC.id),
          recipeLabels: { create: [{ labelId: cOther.id }] },
        },
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: friendC.id,
          type: "recipe",
          visibility: "friends-only",
          recipeId: cRecipe.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        includeAllFriends: true,
      });
      const ids = new Set(labels.map((l) => l.id));
      expect(ids.has(aL1.id)).toBe(true);
      expect(ids.has(aL2.id)).toBe(true);
      expect(ids.has(bShared.id)).toBe(true);
      expect(ids.has(bCo.id)).toBe(true);
      expect(ids.has(bUnrelated.id)).toBe(false);
      expect(ids.has(cAttached.id)).toBe(true);
      expect(ids.has(cOther.id)).toBe(false);
    });
  });

  describe("non-friend visibility", () => {
    it("includes a non-friend's public profile-item-driven labels", async () => {
      const pubLabel = await prisma.label.create({
        data: labelFactory(stranger.id),
      });
      const coLabel = await prisma.label.create({
        data: labelFactory(stranger.id),
      });
      const hidden = await prisma.label.create({
        data: labelFactory(stranger.id),
      });
      // pubLabel and coLabel co-occur on a recipe
      await prisma.recipe.create({
        data: {
          ...recipeFactory(stranger.id),
          recipeLabels: {
            create: [{ labelId: pubLabel.id }, { labelId: coLabel.id }],
          },
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(stranger.id),
          recipeLabels: { create: [{ labelId: hidden.id }] },
        },
      });

      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "label",
          visibility: "public",
          labelId: pubLabel.id,
        }),
      });

      const labels = await getVisibleLabels(owner.id, {
        userIds: [stranger.id],
      });
      const ids = new Set(labels.map((l) => l.id));
      expect(ids.has(pubLabel.id)).toBe(true);
      expect(ids.has(coLabel.id)).toBe(true);
      expect(ids.has(hidden.id)).toBe(false);
    });

    it("excludes a non-friend's friends-only profile items", async () => {
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      await prisma.label.create({ data: labelFactory(stranger.id) });

      const labels = await getVisibleLabels(owner.id, {
        userIds: [stranger.id],
      });
      expect(labels).toEqual([]);
    });

    it("returns nothing for an anonymous viewer when target has no public items", async () => {
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: stranger.id,
          type: "all-recipes",
          visibility: "friends-only",
        }),
      });
      await prisma.label.create({ data: labelFactory(stranger.id) });

      const labels = await getVisibleLabels(undefined, {
        userIds: [stranger.id],
      });
      expect(labels).toEqual([]);
    });
  });

  describe("includeAllFriends false", () => {
    it("excludes friend labels when includeAllFriends is not passed", async () => {
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
      const ownL = await prisma.label.create({
        data: labelFactory(owner.id),
      });
      const fL = await prisma.label.create({
        data: labelFactory(friendA.id),
      });

      const labels = await getVisibleLabels(owner.id, { includeSelf: true });
      const ids = labels.map((l) => l.id);
      expect(ids).toContain(ownL.id);
      expect(ids).not.toContain(fL.id);
    });
  });
});
