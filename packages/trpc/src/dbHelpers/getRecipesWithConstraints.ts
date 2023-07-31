import { getFriendships } from "./getFriendships";
import { RecipeSummary } from "../types/queryTypes";

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
  // const {
  //   em = mikro.em,
  //   userId: contextUserId,
  //   userIds,
  //   folder,
  //   orderBy,
  //   offset,
  //   limit,
  //   recipeIds: filterByRecipeIds,
  //   labels,
  //   labelIntersection,
  //   ratings,
  // } = args;
  //
  // let friends: { [key: string]: User } = {};
  // if (contextUserId) {
  //   const friendships = await getFriendships(contextUserId);
  //   friends = friendships.friends.reduce(
  //     (acc, friend) => ((acc[friend.id] = friend), acc),
  //     {} as typeof friends
  //   );
  // }
  //
  // const friendUserIds = userIds.filter(
  //   (userId) => friends[userId] && userId !== contextUserId
  // );
  // const nonFriendUserIds = userIds.filter(
  //   (userId) => !friends[userId] && userId !== contextUserId
  // );
  //
  // const profileItems = await em.find(ProfileItem, {
  //   $or: [
  //     {
  //       user: friendUserIds,
  //     },
  //     {
  //       user: nonFriendUserIds,
  //       visibility: "public",
  //     },
  //   ],
  // });
  //
  // const profileItemsByUserId = profileItems.reduce((acc, profileItem) => {
  //   acc[profileItem.user.id] ??= [];
  //   acc[profileItem.user.id].push(profileItem);
  //   return acc;
  // }, {} as { [key: string]: ProfileItem[] });
  //
  // const queryFilters: FilterQuery<Recipe>[] = [];
  // for (const userId of userIds) {
  //   const isContextUser = contextUserId && userId === contextUserId;
  //   const profileItemsForUser = profileItemsByUserId[userId] || [];
  //
  //   const isSharingAll = profileItemsForUser.find(
  //     (profileItem) => profileItem.type === "all-recipes"
  //   );
  //
  //   if (isContextUser || isSharingAll) {
  //     queryFilters.push({
  //       user: userId
  //     });
  //   }
  //
  //   profileItemsForUser
  //     .filter((profileItem) => profileItem.type === "label")
  //     .map((profileItem) => profileItem.label?.id)
  //     .filter((labelId): labelId is string => !!labelId)
  //     .forEach((labelId) => {
  //       queryFilters.push({
  //         user: userId,
  //         recipeLabels: {
  //           id: labelId,
  //         },
  //       });
  //     });
  //
  //   profileItemsForUser
  //     .filter((profileItem) => profileItem.type === "recipe")
  //     .map((profileItem) => profileItem.recipe?.id)
  //     .filter((recipeId): recipeId is string => !!recipeId)
  //     .forEach((recipeId) => {
  //       queryFilters.push({
  //         user: userId,
  //         id: recipeId,
  //       });
  //     });
  // }
  //
  // if (!queryFilters.length)
  //   return {
  //     recipes: [],
  //     totalCount: 0,
  //   };
  //
  // const where = {
  //   $and: [] as FilterQuery<Recipe>[],
  // } satisfies FilterQuery<Recipe>;
  //
  // where.$and.push({
  //   $or: queryFilters,
  // });
  // where.$and.push({
  //   folder,
  // });
  //
  // if (ratings) {
  //   where.$and.push({
  //     $or: ratings.map((rating) => ({
  //       rating,
  //     })),
  //   });
  // }
  //
  // if (filterByRecipeIds) {
  //   where.$and.push({ id: filterByRecipeIds });
  // }
  //
  // if (labels && labelIntersection) {
  //   where.$and.push(
  //     ...labels.map(
  //       (label) =>
  //         ({
  //           recipeLabels: {
  //             some: {
  //               label: {
  //                 title: label,
  //               },
  //             },
  //           },
  //         } as FilterQuery<Recipe>)
  //     )
  //   );
  // }
  //
  // if (labels && !labelIntersection) {
  //   where.$and.push({
  //     recipeLabels: {
  //       label: {
  //         title: labels,
  //       },
  //     },
  //   });
  // }
  //
  // const [totalCount, _recipes] = await Promise.all([
  //   em.count(Recipe,
  //     where,
  //   ),
  //   em.find(Recipe, where, {
  //     orderBy,
  //     offset,
  //     limit,
  //     populate: [
  //       'recipeLabels.label.title',
  //       'recipeImages.order',
  //       'recipeImages.image.location',
  //       'user',
  //       'fromUser'
  //     ]
  //   }),
  // ]);
  // console.log('tb', _recipes[26].user.name);
  //
  // const recipes = _recipes.map(r => r.toJSON());
  //
  // console.log('t', recipes[26].user);
  //
  // return {
  //   recipes,
  //   totalCount,
  // };
};
