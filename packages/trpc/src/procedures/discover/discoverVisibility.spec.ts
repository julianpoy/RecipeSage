import {
  prisma,
  Prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import {
  discoverPubliclyVisibleWhere,
  discoverPubliclyVisibleSql,
  discoverRecipeVisibilitySelect,
} from "@recipesage/util/server/db";
import { assertDiscoverRecipeVisible } from "@recipesage/util/server/trpc";
import { test, createUser } from "../../testutils";

const isVisibleToViewer = async (
  discoverRecipeId: string,
  viewerUserId: string | undefined,
) => {
  const discoverRecipe = await prisma.discoverRecipe.findUniqueOrThrow({
    where: { id: discoverRecipeId },
    select: discoverRecipeVisibilitySelect,
  });
  try {
    assertDiscoverRecipeVisible(discoverRecipe, viewerUserId);
    return true;
  } catch {
    return false;
  }
};

describe("discover visibility forms", () => {
  test("publiclyVisibleWhere, publiclyVisibleSql, and the assert agree for non-authors", async ({
    user,
    user2,
  }) => {
    const shadowbannedAuthor = await createUser();

    const active = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.ACTIVE,
      },
    });
    const pending = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.PENDING,
      },
    });
    const shadowbannedState = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.SHADOWBANNED,
      },
    });
    const softDeleted = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.ACTIVE,
        deletedAt: new Date(),
      },
    });
    const byShadowbannedAuthor = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(shadowbannedAuthor.id),
        approvalState: DiscoverApprovalState.ACTIVE,
      },
    });
    await prisma.user.update({
      where: { id: shadowbannedAuthor.id },
      data: { discoverStanding: UserDiscoverStanding.SHADOWBANNED },
    });

    const allIds = [
      active.id,
      pending.id,
      shadowbannedState.id,
      softDeleted.id,
      byShadowbannedAuthor.id,
    ];

    const viaWhere = await prisma.discoverRecipe.findMany({
      where: {
        id: { in: allIds },
        ...discoverPubliclyVisibleWhere,
      },
      select: { id: true },
    });
    expect(viaWhere.map((r) => r.id)).toEqual([active.id]);

    const viaSql = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id
      FROM "Discover_Recipes"
      WHERE id = ANY(${allIds}::uuid[]) AND ${discoverPubliclyVisibleSql}
    `);
    expect(viaSql.map((r) => r.id)).toEqual([active.id]);

    for (const id of allIds) {
      expect(await isVisibleToViewer(id, user2.id)).toEqual(id === active.id);
      expect(await isVisibleToViewer(id, undefined)).toEqual(id === active.id);
    }

    await prisma.user.deleteMany({ where: { id: shadowbannedAuthor.id } });
  });

  test("the assert differs from the public forms only by allowing the author to see their own non-deleted recipes", async ({
    user,
  }) => {
    const pending = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.PENDING,
      },
    });
    const shadowbannedState = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.SHADOWBANNED,
      },
    });
    const softDeleted = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(user.id),
        approvalState: DiscoverApprovalState.ACTIVE,
        deletedAt: new Date(),
      },
    });

    expect(await isVisibleToViewer(pending.id, user.id)).toEqual(true);
    expect(await isVisibleToViewer(shadowbannedState.id, user.id)).toEqual(
      true,
    );
    expect(await isVisibleToViewer(softDeleted.id, user.id)).toEqual(false);
  });
});
