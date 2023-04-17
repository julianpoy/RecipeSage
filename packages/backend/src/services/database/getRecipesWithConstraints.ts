import dedent from "ts-dedent";

const Op = require('sequelize').Op;
const SQ = require('../../models').sequelize;
const User = require('../../models').User;
const Label = require('../../models').Label;
const Recipe = require('../../models').Recipe;
const ProfileItem = require('../../models').ProfileItem;
const Image = require('../../models').Image;
const {getFriendships} = require('../../utils/getFriendships');

export const getRecipesWithConstraints = async (args: {
  userId: string,
  userIds: string[],
  folder: string,
  sortBy: [string, string],
  offset: number,
  limit: number,
  transaction?: any,
  recipeIds?: string[],
  labels?: string[],
  labelIntersection?: boolean,
  ratings?: string[]
}) => {
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

  const friendships = await getFriendships(contextUserId);
  const friends = friendships.friends.reduce((acc, friend) => (acc[friend.otherUser.id] = friend, acc), {});

  const friendUserIds = userIds.filter((userId) => friends[userId] && userId !== contextUserId);
  const nonFriendUserIds = userIds.filter((userId) => !friends[userId] && userId !== contextUserId);

  const profileItems = await ProfileItem.findAll({
    where: {
      [Op.or]: [{
        userId: friendUserIds,
      }, {
        userId: nonFriendUserIds,
        visibility: 'public',
      }]
    }
  });

  const profileItemsByUserId = profileItems.reduce((acc, profileItem) => {
    acc[profileItem.userId] ??= [];
    acc[profileItem.userId] = profileItem;
    return acc;
  }, {});

  const queryFilters: any[] = [];
  for (const userId of userIds) {
    const isContextUser = userId === contextUserId;
    const profileItemsForUser = profileItemsByUserId[userId] || [];

    const isSharingAll = profileItemsForUser.find((profileItem) => profileItem.type === 'all-recipes');

    if (isContextUser || isSharingAll) {
      queryFilters.push({
        userId,
      });
    }

    profileItemsForUser
      .filter((profileItem) => profileItem.type === 'label')
      .map((profileItem) => profileItem.labelId)
      .forEach((labelId) => {
        queryFilters.push({
          userId,
          labelId,
        });
      });

    profileItemsForUser
      .filter((profileItem) => profileItem.type === 'recipe')
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
    } as { [key: string]: string };

    if (queryFilter.labelId) filter['$labels.id$'] = queryFilter.labelId;
    if (queryFilter.recipeId) filter.id = queryFilter.recipeId;

    return filter;
  });

  const where = {
    [Op.or]: sqQueryFilters,
    ...(labels ? { ['$labels.title$']: labels } : {}),
    ...(ratings ? { rating: ratings } : {}),
    ...(filterByRecipeIds ? { recipeId: filterByRecipeIds } : {}),
    folder,
  };

  const having = labels && labelIntersection ? { having: SQ.literal(`COUNT("labels"."id") = ${SQ.escape(labels.length)}`) } : {};

  const totalCount = await Recipe.count({
    where,
    include: [{
      attributes: [],
      model: Label,
      as: 'labels',
      through: {
        attributes: [],
      }
    }],
    ...having,
    distinct: true,
    transaction,
  });

  const recipesWithIdsOnly = await Recipe.findAll({
    where,
    attributes: ['id'],
    include: [{
      attributes: [],
      model: Label,
      as: 'labels',
      through: {
        attributes: [],
      }
    }],
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
    include: [{
      model: Label,
      as: 'labels',
      attributes: ['id', 'title'],
      through: {
        attributes: []
      }
    }, {
      model: Image,
      as: 'images',
      attributes: ['id', 'location'],
      through: {
        attributes: ['id', 'order']
      }
    }, {
      model: User,
      as: 'fromUser',
      attributes: ['name', 'email']
    }],
    order: [sortBy],
    transaction,
  });

  return {
    data: recipes,
    totalCount,
  }
};

