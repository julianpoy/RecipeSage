import { Op } from "sequelize";

import {
  sequelize,
  User,
  Label,
  Recipe,
  ProfileItem,
  Image,
} from "../../models";
import { getFriendships } from "../../utils/getFriendships";

export const getRecipesWithConstraints = async (args) => {
  const {
    userId: contextUserId,
    userIds,
    folder,
    sortBy,
    offset,
    limit,
    transaction,
    recipeIds: filterByRecipeIds,
    labels,
    labelIntersection,
    ratings,
  } = args;

  let friends = [];
  if (contextUserId) {
    const friendships = await getFriendships(contextUserId);
    friends = friendships.friends.reduce(
      (acc, friend) => ((acc[friend.otherUser.id] = friend), acc),
      {},
    );
  }

  const friendUserIds = userIds.filter(
    (userId) => friends[userId] && userId !== contextUserId,
  );
  const nonFriendUserIds = userIds.filter(
    (userId) => !friends[userId] && userId !== contextUserId,
  );

  const profileItems = await ProfileItem.findAll({
    where: {
      [Op.or]: [
        {
          userId: friendUserIds,
        },
        {
          userId: nonFriendUserIds,
          visibility: "public",
        },
      ],
    },
  });

  const profileItemsByUserId = profileItems.reduce((acc, profileItem) => {
    acc[profileItem.userId] ??= [];
    acc[profileItem.userId].push(profileItem);
    return acc;
  }, {});

  const queryFilters = [];
  for (const userId of userIds) {
    const isContextUser = contextUserId && userId === contextUserId;
    const profileItemsForUser = profileItemsByUserId[userId] || [];

    const isSharingAll = profileItemsForUser.find(
      (profileItem) => profileItem.type === "all-recipes",
    );

    if (isContextUser || isSharingAll) {
      queryFilters.push({
        userId,
      });
    }

    profileItemsForUser
      .filter((profileItem) => profileItem.type === "label")
      .map((profileItem) => profileItem.labelId)
      .forEach((labelId) => {
        queryFilters.push({
          userId,
          labelId,
        });
      });

    profileItemsForUser
      .filter((profileItem) => profileItem.type === "recipe")
      .map((profileItem) => profileItem.recipeId)
      .forEach((recipeId) => {
        queryFilters.push({
          userId,
          recipeId,
        });
      });
  }

  const sqQueryFilters = queryFilters.map((queryFilter) => {
    const filter = {
      userId: queryFilter.userId,
    };

    if (queryFilter.labelId) filter["$labels.id$"] = queryFilter.labelId;
    if (queryFilter.recipeId) filter.id = queryFilter.recipeId;

    return filter;
  });

  const where = {
    [Op.or]: sqQueryFilters,
    ...(labels ? { ["$labels.title$"]: labels } : {}),
    ...(ratings ? { rating: ratings } : {}),
    ...(filterByRecipeIds ? { id: filterByRecipeIds } : {}),
    folder,
  };

  const having =
    labels && labelIntersection
      ? {
          having: sequelize.literal(
            `COUNT("labels"."id") = ${sequelize.escape(labels.length)}`,
          ),
        }
      : {};

  const totalCount = await Recipe.count({
    where,
    include: [
      {
        attributes: [],
        model: Label,
        as: "labels",
        through: {
          attributes: [],
        },
      },
    ],
    ...having,
    distinct: true,
    transaction,
  });

  const recipesWithIdsOnly = await Recipe.findAll({
    where,
    attributes: ["id"],
    include: [
      {
        attributes: [],
        model: Label,
        as: "labels",
        through: {
          attributes: [],
        },
      },
    ],
    group: '"Recipe".id',
    limit,
    offset,
    transaction,
    subQuery: false,
    order: [sortBy],
    ...having,
    // raw: true, // Perf - do not construct sequelize model
  });

  const recipeIds = recipesWithIdsOnly.map((recipe) => recipe.id);

  const recipes = await Recipe.findAll({
    where: {
      id: recipeIds,
    },
    include: [
      {
        model: Label,
        as: "labels",
        attributes: ["id", "title"],
        through: {
          attributes: [],
        },
      },
      {
        model: Image,
        as: "images",
        attributes: ["id", "location"],
        through: {
          attributes: ["id", "order"],
        },
      },
      {
        model: User,
        as: "fromUser",
        attributes: ["name", "email"],
      },
    ],
    order: [sortBy],
    transaction,
  });

  return {
    data: recipes,
    totalCount,
  };
};
