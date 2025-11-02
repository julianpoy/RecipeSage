import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEventIgnoringErrors,
  getShoppingListItemCategories,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const createShoppingListItems = publicProcedure
  .input(
    z.object({
      shoppingListId: z.string().uuid(),
      items: z.array(
        z.object({
          title: z.string(),
          recipeId: z.string().uuid().nullable(),
          completed: z.boolean().optional(),
          categoryTitle: z.string().optional(),
        }),
      ),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToShoppingList(
      session.userId,
      input.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    const autoCategories = await getShoppingListItemCategories(input.items.map((el) => el.title));
    const itemsWithCategoryTitles = input.items.map((item, idx) => ({
      ...item,
      completed: item.completed ?? false,
      categoryTitle: item.categoryTitle ?? `::${autoCategories[idx]}`,
      userId: session.userId,
      shoppingListId: input.shoppingListId
    }));

    await prisma.shoppingListItem.createMany({
      data: itemsWithCategoryTitles,
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: input.shoppingListId,
        },
      );
    }

    return {
      reference,
    };
  });
