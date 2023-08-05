import { getFriendships } from "./getFriendships";
import { RecipeSummary } from "../types/queryTypes";
import { db, ProfileItem, ProfileItems, RecipeLabels, Recipes } from "@recipesage/drizzle";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

export interface OrderBy {
  title?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

export const getRecipesWithConstraints = async (args: {
  // em?: typeof mikro.em;
  userId?: string;
  userIds: string[];
  folder: string;
  orderBy: OrderBy;
  offset: number;
  limit: number;
  recipeIds?: string[];
  labels?: string[];
  labelIntersection?: boolean;
  ratings?: (number | null)[];
}): Promise<{ recipes: RecipeSummary[]; totalCount: number }> => {
  const {
    // em = mikro.em,
    userId: contextUserId,
    userIds,
    folder,
    orderBy,
    offset,
    limit,
    recipeIds: filterByRecipeIds,
    labels,
    labelIntersection,
    ratings,
  } = args;

  let friends: { [key: string]: string } = {};
  if (contextUserId) {
    const friendships = await getFriendships(contextUserId);
    friends = friendships.friends.reduce(
      (acc, friend) => ((acc[friend] = friend), acc),
      {} as typeof friends
    );
  }

  const friendUserIds = userIds.filter(
    (userId) => friends[userId] && userId !== contextUserId
  );
  const nonFriendUserIds = userIds.filter(
    (userId) => !friends[userId] && userId !== contextUserId
  );

  const profileItems = await db
    .select({
      userId: ProfileItems.userId,
      labelId: ProfileItems.labelId,
      recipeId: ProfileItems.recipeId,
      type: ProfileItems.type,
    })
    .from(ProfileItems)
    .where(or(
      inArray(ProfileItems.userId, friendUserIds),
      and(
        inArray(ProfileItems.userId, nonFriendUserIds),
        eq(ProfileItems.visibility, 'public')
      )
    ));

  const profileItemsByUserId = profileItems.reduce((acc, profileItem) => {
    acc[profileItem.userId] ??= [];
    acc[profileItem.userId].push(profileItem);
    return acc;
  }, {} as { [key: string]: (typeof profileItems) });

  const visibilityFilters: Parameters<typeof or> = [];
  for (const userId of userIds) {
    const isContextUser = contextUserId && userId === contextUserId;
    const profileItemsForUser = profileItemsByUserId[userId] || [];

    const isSharingAll = profileItemsForUser.find(
      (profileItem) => profileItem.type === "all-recipes"
    );

    if (isContextUser || isSharingAll) {
      visibilityFilters.push(eq(
        Recipes.userId, userId
      ));
    }

    profileItemsForUser
      .filter((profileItem) => profileItem.type === "label")
      .map((profileItem) => profileItem.labelId)
      .filter((labelId): labelId is string => !!labelId)
      .forEach((labelId) => {
        visibilityFilters.push(and(
          eq(Recipes.userId, userId),
          eq(RecipeLabels.labelId, labelId)
        ));
      });

    profileItemsForUser
      .filter((profileItem) => profileItem.type === "recipe")
      .map((profileItem) => profileItem.recipeId)
      .filter((recipeId): recipeId is string => !!recipeId)
      .forEach((recipeId) => {
        visibilityFilters.push(and(
          eq(Recipes.userId, userId),
          eq(Recipes.id, recipeId),
        ));
      });
  }

  if (!visibilityFilters.length)
    return {
      recipes: [],
      totalCount: 0,
    };

  const queryFilters: Parameters<typeof and> = [];

  queryFilters.push(or(...visibilityFilters));
  queryFilters.push(eq(
    Recipes.folder, folder,
  ));

  if (ratings) {
    queryFilters.push(...ratings.map((rating) => {
      if (rating) {
        return eq(
          Recipes.rating,
          rating
        )
      } else {
        return isNull(
          Recipes.rating,
        );
      }
    }));
  }

  if (filterByRecipeIds) {
    where.$and.push({ id: filterByRecipeIds });
  }

  if (labels && labelIntersection) {
    where.$and.push(
      ...labels.map(
        (label) =>
          ({
            recipeLabels: {
              some: {
                label: {
                  title: label,
                },
              },
            },
          } as FilterQuery<Recipe>)
      )
    );
  }

  if (labels && !labelIntersection) {
    where.$and.push({
      recipeLabels: {
        label: {
          title: labels,
        },
      },
    });
  }

  const [totalCount, _recipes] = await Promise.all([
    em.count(Recipe,
      where,
    ),
    em.find(Recipe, where, {
      orderBy,
      offset,
      limit,
      populate: [
        'recipeLabels.label.title',
        'recipeImages.order',
        'recipeImages.image.location',
        'user',
        'fromUser'
      ]
    }),
  ]);
  console.log('tb', _recipes[26].user.name);

  const recipes = _recipes.map(r => r.toJSON());

  console.log('t', recipes[26].user);

  return {
    recipes,
    totalCount,
  };
};
