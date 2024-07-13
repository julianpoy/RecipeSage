import { prisma } from "@recipesage/prisma";

export enum ShoppingListAccessLevel {
  None = "none",
  Owner = "owner",
  Collaborator = "collaborator",
}

type AccessResultType =
  | {
      level: ShoppingListAccessLevel.None;
      ownerId: null;
      collaboratorIds: null;
      subscriberIds: null;
    }
  | {
      level:
        | ShoppingListAccessLevel.Owner
        | ShoppingListAccessLevel.Collaborator;
      ownerId: string;
      collaboratorIds: string[];
      subscriberIds: string[];
    };

export const getAccessToShoppingList = async (
  userId: string,
  shoppingListId: string,
): Promise<AccessResultType> => {
  const shoppingList = await prisma.shoppingList.findUnique({
    where: {
      id: shoppingListId,
      OR: [
        {
          userId,
        },
        {
          collaboratorUsers: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      collaboratorUsers: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!shoppingList) {
    return {
      level: ShoppingListAccessLevel.None,
      ownerId: null,
      collaboratorIds: null,
      subscriberIds: null,
    };
  }

  const ownerId = shoppingList.userId;
  const collaboratorIds = shoppingList.collaboratorUsers.map((el) => el.userId);
  const subscriberIds = [ownerId, ...collaboratorIds];

  if (shoppingList.userId === userId) {
    return {
      level: ShoppingListAccessLevel.Owner,
      ownerId,
      collaboratorIds,
      subscriberIds,
    };
  }

  return {
    level: ShoppingListAccessLevel.Collaborator,
    ownerId,
    collaboratorIds,
    subscriberIds,
  };
};
