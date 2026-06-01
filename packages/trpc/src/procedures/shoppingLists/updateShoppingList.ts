import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import type { Prisma } from "@recipesage/prisma";
import {
  SHOPPING_LIST_CATEGORY_ORDER_LENGTH_LIMIT,
  SHOPPING_LIST_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";

export const updateShoppingList = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/updateShoppingList",
      tags: ["shoppingLists"],
      summary: "Update a shopping list",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(SHOPPING_LIST_TITLE_LENGTH_LIMIT).optional(),
      collaboratorUserIds: z.array(z.uuid()).optional(),
      categoryOrder: z
        .string()
        .max(SHOPPING_LIST_CATEGORY_ORDER_LENGTH_LIMIT)
        .nullable()
        .optional(),
    }),
  )
  .output(
    z.object({
      reference: z.uuid(),
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const access = await getAccessToShoppingList(ctx.session.userId, input.id);

    if (access.level !== ShoppingListAccessLevel.Owner) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shopping list not found or you do not own it",
      });
    }

    let collaboratorUsersUpdate:
      | Prisma.ShoppingListCollaboratorUncheckedUpdateManyWithoutShoppingListNestedInput
      | undefined = undefined;
    if (input.collaboratorUserIds) {
      const collaboratorUsers = await prisma.user.findMany({
        where: {
          id: {
            in: input.collaboratorUserIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (collaboratorUsers.length < input.collaboratorUserIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more of the collaborators you specified are not valid",
        });
      }

      await prisma.shoppingListCollaborator.deleteMany({
        where: {
          shoppingListId: input.id,
        },
      });

      collaboratorUsersUpdate = {
        createMany: {
          data: collaboratorUsers.map((collaboratorUser) => ({
            userId: collaboratorUser.id,
          })),
        },
      };
    }

    const updatedShoppingList = await prisma.shoppingList.update({
      where: {
        id: input.id,
      },
      data: {
        title: input.title,
        userId: ctx.session.userId,
        collaboratorUsers: collaboratorUsersUpdate,
        categoryOrder: input.categoryOrder,
      },
    });

    const reference = crypto.randomUUID();
    const subscriberIds = [
      ...new Set([
        updatedShoppingList.userId,
        // We need to notify both the old collaborators and the new collaborators of the update
        ...access.subscriberIds,
        ...(input.collaboratorUserIds || []),
      ]),
    ];
    for (const subscriberId of subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: updatedShoppingList.id,
        },
      );
    }

    return {
      reference,
      id: updatedShoppingList.id,
    };
  });
