import { prisma } from "@recipesage/prisma";

export enum MealPlanAccessLevel {
  None = "none",
  Owner = "owner",
  Collaborator = "collaborator",
}

type AccessResultType =
  | {
      level: MealPlanAccessLevel.None;
      ownerId: null;
      collaboratorIds: null;
      subscriberIds: null;
    }
  | {
      level: MealPlanAccessLevel.Owner | MealPlanAccessLevel.Collaborator;
      ownerId: string;
      collaboratorIds: string[];
      subscriberIds: string[];
    };

export const getAccessToMealPlan = async (
  userId: string,
  mealPlanId: string,
): Promise<AccessResultType> => {
  const mealPlan = await prisma.mealPlan.findUnique({
    where: {
      id: mealPlanId,
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

  if (!mealPlan) {
    return {
      level: MealPlanAccessLevel.None,
      ownerId: null,
      collaboratorIds: null,
      subscriberIds: null,
    };
  }

  const ownerId = mealPlan.userId;
  const collaboratorIds = mealPlan.collaboratorUsers.map((el) => el.userId);
  const subscriberIds = [ownerId, ...collaboratorIds];

  if (mealPlan.userId === userId) {
    return {
      level: MealPlanAccessLevel.Owner,
      ownerId,
      collaboratorIds,
      subscriberIds,
    };
  }

  return {
    level: MealPlanAccessLevel.Collaborator,
    ownerId,
    collaboratorIds,
    subscriberIds,
  };
};
