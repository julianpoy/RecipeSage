import { publicProcedure } from "../../trpc";
import {
  getFriendshipIds,
  getRecipeVisibilityQueryFilter,
} from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";

const requireMaxSyncOlderThanDays = 60;
const getRequiresFullSync = (lastSync: string) => {
  const lastSyncDate = new Date(lastSync);
  const requireSyncOlderThan = new Date();
  requireSyncOlderThan.setDate(
    requireSyncOlderThan.getDate() - requireMaxSyncOlderThanDays,
  );

  return lastSyncDate.getTime() < requireSyncOlderThan.getTime();
};

export const getRecipeSyncManifest = publicProcedure
  .input(
    z.object({
      lastSyncDate: z.string().datetime(),
    }),
  )
  .query(
    async ({
      ctx,
      input,
    }): Promise<{
      needsSync: { id: string }[];
      tombstones: { id: string }[];
      requiresFullSync: boolean;
    }> => {
      if (getRequiresFullSync(input.lastSyncDate)) {
        return {
          needsSync: [],
          tombstones: [],
          requiresFullSync: true,
        };
      }

      const session = ctx.session;
      validateTrpcSession(session);

      const userIds = [session.userId];
      const friendships = await getFriendshipIds(session.userId);
      userIds.push(...friendships.friends);

      const queryFilters = await getRecipeVisibilityQueryFilter({
        userId: session.userId,
        userIds,
      });

      const recipesToSync = await prisma.recipe.findMany({
        where: {
          AND: [
            {
              OR: queryFilters,
            },
            {
              updatedAt: {
                gte: new Date(input.lastSyncDate),
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      const tombstones = await prisma.recipeTombstone.findMany({
        where: {
          userId: session.userId,
          updatedAt: {
            gte: new Date(input.lastSyncDate),
          },
        },
        select: {
          id: true,
        },
      });

      return {
        needsSync: recipesToSync,
        tombstones: tombstones,
        requiresFullSync: false,
      };
    },
  );
