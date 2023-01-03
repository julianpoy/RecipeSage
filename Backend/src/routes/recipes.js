const express = require('express');
const router = express.Router();
const cors = require('cors');
const xmljs = require('xml-js');
const moment = require('moment');

// DB
const Op = require('sequelize').Op;
const SQ = require('../models').sequelize;
const User = require('../models').User;
const Recipe = require('../models').Recipe;
const Label = require('../models').Label;
const Recipe_Label = require('../models').Recipe_Label;
const Image = require('../models').Image;
const Recipe_Image = require('../models').Recipe_Image;
const Friendship = require('../models').Friendship;
const ProfileItem = require('../models').ProfileItem;

// Service
const MiddlewareService = require('../services/middleware');
const UtilService = require('../services/util');
const StorageService = require('../services/storage');
const ElasticService = require('../services/elastic');
const SubscriptionsService = require('../services/subscriptions');
const JSONLDService = require('../services/json-ld');

// Util
const { wrapRequestWithErrorHandler } = require('../utils/wrapRequestWithErrorHandler');
const {
  BadRequest,
  Unauthorized,
  NotFound,
  PreconditionFailed,
  InternalServerError
} = require('../utils/errors');
const {joiValidator} = require('../middleware/joiValidator');
const Joi = require('joi');

const VALID_RECIPE_FOLDERS = ['main', 'inbox'];
const VALID_RATING_FILTERS = /^(\d|null)(,(\d|null))*$/;
const VALID_RECIPE_SORT = ['-title', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt'];

const parseRatingFilter = (ratingFilter) => {
  return ratingFilter
    ?.split(',')
    ?.filter(el => el !== 'null')
    ?.map(el => parseInt(el, 10));
};

// TODO: Remove this. Legacy frontend compat
const legacyImageHandler = async (req, res, next) => {
  try {
    const highResConversion = await SubscriptionsService.userHasCapability(
      res.locals.session.userId,
      SubscriptionsService.CAPABILITIES.HIGH_RES_IMAGES
    );

    await StorageService.upload('image', req, res);
    if (req.file) {
      const uploadedFile = req.file;
      const newImage = await Image.create({
        userId: res.locals.session.userId,
        location: uploadedFile.location,
        key: uploadedFile.key,
        json: uploadedFile
      });

      const imageIds = req.body.imageIds || [];
      imageIds.unshift(newImage.id);
      req.body.imageIds = imageIds;
    }

    if (req.body.imageURL) {
      let uploadedFile;
      try {
        uploadedFile = await StorageService.sendURLToStorage(req.body.imageURL, highResConversion);
      } catch (e) {
        e.status = 415;
        throw e;
      }

      const newImage = await Image.create({
        userId: res.locals.session.userId,
        location: uploadedFile.location,
        key: uploadedFile.key,
        json: uploadedFile
      });

      const imageIds = req.body.imageIds || [];
      imageIds.unshift(newImage.id);
      req.body.imageIds = imageIds;
    }

    next();
  } catch (e) {
    next(e);
  }
};

const applyLegacyImageField = recipe => {
  if (recipe.toJSON) recipe = recipe.toJSON();

  if (recipe.images && recipe.images.length > 0) {
    const image = recipe.images[0];
    recipe.image = {
      location: image.location
    };
  } else {
    recipe.image = null;
  }

  return recipe;
};

//Create a new recipe
router.post(
  '/',
  joiValidator(Joi.object({
    body: Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow('').optional(),
      yield: Joi.string().allow('').optional(),
      activeTime: Joi.string().allow('').optional(),
      totalTime: Joi.string().allow('').optional(),
      source: Joi.string().allow('').optional(),
      url: Joi.string().allow('').optional(),
      notes: Joi.string().allow('').optional(),
      ingredients: Joi.string().allow('').optional(),
      instructions: Joi.string().allow('').optional(),
      rating: Joi.number().min(1).max(5).allow(null).optional(),
      labels: Joi.array().items(Joi.string()).optional(),
      imageIds: Joi.array().items(Joi.string().uuid()).optional(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user']),
  legacyImageHandler,
  wrapRequestWithErrorHandler(async (req, res) => {

    if (!req.body.title || req.body.title.length === 0) {
      throw PreconditionFailed('Recipe title must be provided.');
    }

    const recipe = await SQ.transaction(async transaction => {
      const adjustedTitle = await Recipe.findTitle(res.locals.session.userId, null, req.body.title, transaction);

      const recipe = await Recipe.create({
        userId: res.locals.session.userId,
        title: adjustedTitle,
        description: req.body.description || '',
        yield: req.body.yield || '',
        activeTime: req.body.activeTime || '',
        totalTime: req.body.totalTime || '',
        source: req.body.source || '',
        url: req.body.url || '',
        notes: req.body.notes || '',
        ingredients: req.body.ingredients || '',
        instructions: req.body.instructions || '',
        rating: req.body.rating || null,
        folder: 'main'
      }, {
        transaction
      });

      if (req.body.imageIds) {
        const canUploadMultipleImages = await SubscriptionsService.userHasCapability(
          res.locals.session.userId,
          SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
        );

        if (!canUploadMultipleImages && req.body.imageIds.length > 1) {
          const images = await Image.findAll({
            where: {
              id: {
                [Op.in]: req.body.imageIds
              }
            },
            transaction
          });
          const imagesById = images.reduce((acc, img) => ({ ...acc, [img.id]: img }), {});

          req.body.imageIds = req.body.imageIds.filter((imageId, idx) =>
            idx === 0 || // Allow first image always (users can always upload the first image)
          imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
          moment(imagesById[imageId].createdAt).add(1, 'hour').isBefore(moment()) // Allow old images (user's subscription expired)
          );
        }

        if (req.body.imageIds.length > 10) req.body.imageIds.splice(10); // Limit to 10 images per recipe max

        await Recipe_Image.bulkCreate(req.body.imageIds.map((imageId, idx) => ({
          imageId: imageId,
          recipeId: recipe.id,
          order: idx
        })), {
          transaction
        });
      }

      if (req.body.labels?.length) {
        const sanitizedLabelTitles = req.body.labels.map(title => UtilService.cleanLabelTitle(title || '')).filter(el => el.trim());
        const labelTitles = [...new Set(sanitizedLabelTitles)]; // Dedupe

        await Label.bulkCreate(labelTitles.map(title => ({
          userId: res.locals.session.userId,
          title,
        })), {
          ignoreDuplicates: true,
          transaction,
        });

        const labels = await Label.findAll({
          where: {
            userId: res.locals.session.userId,
            title: labelTitles,
          },
          attributes: ['id'],
          transaction,
        });

        if (labels.length !== labelTitles.length) {
          throw InternalServerError('Labels length did not match labelTitles length. Orphaned labels!');
        }

        await Recipe_Label.bulkCreate(labels.map(label => ({
          recipeId: recipe.id,
          labelId: label.id
        })), {
          ignoreDuplicates: true,
          transaction
        });
      }

      return recipe;
    });

    const serializedRecipe = recipe.toJSON();
    serializedRecipe.labels = [];
    res.status(201).json(serializedRecipe);
  }));

// Count a user's recipes
router.get(
  '/count',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    const count = await Recipe.count({
      where: {
        userId: res.locals.session.userId,
        folder: req.query.folder || 'main'
      }
    });

    res.status(200).json({
      count
    });
  }));

//Get all of a user's recipes (paginated)
router.get(
  '/by-page',
  joiValidator(Joi.object({
    query: Joi.object({
      sort: Joi.string().valid(...VALID_RECIPE_SORT).optional(),
      userId: Joi.string().uuid().optional(),
      folder: Joi.string().valid(...VALID_RECIPE_FOLDERS).optional(),
      labels: Joi.string().optional(),
      labelIntersection: Joi.boolean().optional(),
      ratingFilter: Joi.string().regex(VALID_RATING_FILTERS).optional(),
      count: Joi.number().optional(),
      offset: Joi.number().optional(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user'], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!res.locals.session && !req.query.userId) {
      throw Unauthorized('You must be logged in to request this resource');
    }

    const myUserId = res.locals.session ? res.locals.session.userId : null;
    let userId = myUserId;
    const folder = req.query.folder || 'main';
    const labelFilter = req.query.labels ? req.query.labels.split(',') : [];

    // Only check for shared items if we're browsing another user's recipes
    if (req.query.userId && myUserId !== req.query.userId) {
      const user = await User.findByPk(req.query.userId);
      if (!user) throw NotFound('User with that ID not found');

      userId = user.id;

      let userIsFriend = false;
      if (res.locals.session) userIsFriend = await Friendship.areUsersFriends(res.locals.session.userId, userId);

      let labelId;
      if (labelFilter.length > 1) {
        throw BadRequest('Can view maximum 1 label at a time from another user\'s profile');
      } else if (labelFilter.length > 0) {
        const label = await Label.findOne({
          where: {
            title: labelFilter[0],
            userId
          }
        });
        labelId = label.id;
      }

      const profileItem = await ProfileItem.findOne({
        where: {
          userId,
          ...(userIsFriend ? {} : { visibility: 'public' }),
          ...(labelId ? { type: 'label', labelId } : { type: 'all-recipes' })
        }
      });

      if (!profileItem) {
        throw NotFound('Profile item not found or not visible');
      }
    }

    let sort = '"Recipe"."title" ASC';
    if (req.query.sort) {
      switch(req.query.sort){
      case '-title':
        sort = '"Recipe"."title" ASC';
        break;
      case 'createdAt':
        sort = '"Recipe"."createdAt" ASC';
        break;
      case '-createdAt':
        sort = '"Recipe"."createdAt" DESC';
        break;
      case 'updatedAt':
        sort = '"Recipe"."updatedAt" ASC';
        break;
      case '-updatedAt':
        sort = '"Recipe"."updatedAt" DESC';
        break;
      }
    }

    const unlabeledOnly = labelFilter.includes('unlabeled');
    if (unlabeledOnly) labelFilter.splice(0);
    const labelFilterMap = labelFilter.reduce((acc, e, idx) => {
      acc[`labelFilter${idx}`] = e;
      return acc;
    }, {});

    // Fields
    const recipeAttributes = ['id', 'title', 'description', 'source', 'url', 'folder', 'rating', 'fromUserId', 'createdAt', 'updatedAt'];
    const labelAttributes = ['id', 'title'];
    const imageAttributes = ['id', 'location'];
    const recipeImageAttributes = ['id', 'order'];
    const fromUserAttributes = ['name', 'email'];

    // Building fields
    const recipeSelect = recipeAttributes.map(el => `"Recipe"."${el}" AS "${el}"`).join(', ');
    const labelSelect = labelAttributes.map(el => `"Label"."${el}" AS "labels.${el}"`).join(', ');
    const imageSelect = imageAttributes.map(el => `"Image"."${el}" AS "images.${el}"`).join(', ');
    const recipeImageSelect = recipeImageAttributes.map(el => `"Recipe_Image"."${el}" AS "images.Recipe_Image.${el}"`).join(', ');
    const fromUserSelect = fromUserAttributes.map(el => `"FromUser"."${el}" AS "fromUser.${el}"`).join(', ');
    let fields = `${recipeSelect}, ${labelSelect}, ${imageSelect}, ${recipeImageSelect}`;
    if (folder === 'inbox') fields += `, ${fromUserSelect}`;

    // Labeling
    const labelFilterClause = `"Label".title IN (${ Object.keys(labelFilterMap).map(e => `$${e}`).join(',') })`;
    const labelIntersectionClause = req.query.labelIntersection === 'true' ? `HAVING count("Label") = ${labelFilter.length}` : '';
    const unlabeledClause = unlabeledOnly ? 'AND "Label".id IS NULL' : '';
    const unlabeledJoin = unlabeledOnly ? `
      LEFT OUTER JOIN "Recipe_Labels" AS "Recipe_Label" ON "Recipe_Label"."recipeId" = "Recipe".id
      LEFT OUTER JOIN "Labels" AS "Label" ON "Label".id = "Recipe_Label"."labelId"
    `: '';

    // Rating
    let ratingClause = '';
    const ratingFilter = parseRatingFilter(req.query.ratingFilter);
    if (ratingFilter) {
      const includeNull = req.query.ratingFilter.includes('null');
      const nullClause = 'OR "Recipe"."rating" IS NULL';
      // Must use ANY rather than IN due to https://github.com/sequelize/sequelize/issues/8140
      ratingClause = `AND ("Recipe"."rating" = ANY($ratingFilter) ${includeNull ? nullClause : ''})`;
    }

    const countQuery = labelFilter.length > 0 ?
      `SELECT "Recipe".id
      FROM "Recipe_Labels" "Recipe_Label", "Recipes" "Recipe", "Labels" "Label"
      WHERE "Recipe_Label"."labelId" = "Label".id
      AND ${labelFilterClause}
      AND "Recipe".id = "Recipe_Label"."recipeId"
      AND "Recipe"."userId" = $userId
      AND "Recipe"."folder" = $folder
      ${ratingClause}
      GROUP BY "Recipe".id
      ${labelIntersectionClause}`
      :
      `SELECT count("Recipe".id)
      FROM "Recipes" AS "Recipe"
      ${unlabeledJoin}
      WHERE "Recipe"."userId" = $userId
      AND "Recipe"."folder" = $folder
      ${ratingClause}
      ${unlabeledClause}`;

    const fetchQuery = labelFilter.length > 0 ?
      `SELECT ${fields} from (SELECT "Recipe".id
      FROM "Recipe_Labels" "Recipe_Label", "Recipes" "Recipe", "Labels" "Label"
      WHERE "Recipe_Label"."labelId" = "Label".id
      AND ${labelFilterClause}
      AND "Recipe".id = "Recipe_Label"."recipeId"
      AND "Recipe"."userId" = $userId
      AND "Recipe"."folder" = $folder
      ${ratingClause}
      GROUP BY "Recipe".id
      ${labelIntersectionClause}
      ORDER BY ${sort}
      LIMIT $limit
      OFFSET $offset) AS pag
      INNER JOIN "Recipes" AS "Recipe" ON "Recipe".id = pag.id
      INNER JOIN "Recipe_Labels" AS "Recipe_Label" ON "Recipe_Label"."recipeId" = pag.id
      INNER JOIN "Labels" AS "Label" ON "Label".id = "Recipe_Label"."labelId"
      LEFT OUTER JOIN "Recipe_Images" AS "Recipe_Image" ON "Recipe_Image"."recipeId" = pag.id
      LEFT OUTER JOIN "Images" AS "Image" ON "Image".id = "Recipe_Image"."imageId"
      ${folder === 'inbox' ? 'LEFT OUTER JOIN "Users" AS "FromUser" ON "FromUser".id = "Recipe"."fromUserId"' : ''}
      ORDER BY ${sort}`
      :
      `SELECT ${fields} FROM (SELECT "Recipe".id
      FROM "Recipes" AS "Recipe"
      ${unlabeledJoin}
      WHERE "Recipe"."userId" = $userId
      AND "Recipe"."folder" = $folder
      ${ratingClause}
      ${unlabeledClause}
      GROUP BY "Recipe".id
      ORDER BY ${sort}
      LIMIT $limit
      OFFSET $offset) AS pag
      INNER JOIN "Recipes" AS "Recipe" ON "Recipe".id = pag.id
      LEFT OUTER JOIN "Recipe_Labels" AS "Recipe_Label" ON "Recipe_Label"."recipeId" = pag.id
      LEFT OUTER JOIN "Labels" AS "Label" ON "Label".id = "Recipe_Label"."labelId"
      LEFT OUTER JOIN "Recipe_Images" AS "Recipe_Image" ON "Recipe_Image"."recipeId" = pag.id
      LEFT OUTER JOIN "Images" AS "Image" ON "Image".id = "Recipe_Image"."imageId"
      ${folder === 'inbox' ? 'LEFT OUTER JOIN "Users" AS "FromUser" ON "FromUser".id = "Recipe"."fromUserId"' : ''}
      ORDER BY ${sort}`;

    const countQueryOptions = {
      type: SQ.QueryTypes.SELECT,
      bind: {
        userId,
        folder,
        ...labelFilterMap,
        ratingFilter,
      }
    };

    const fetchQueryOptions = {
      type: SQ.QueryTypes.SELECT,
      hasJoin: true,
      bind: {
        userId,
        folder,
        limit: Math.min(parseInt(req.query.count) || 100, 500),
        offset: req.query.offset || 0,
        ...labelFilterMap,
        ratingFilter,
      },
      model: Recipe,
      include: [{
        model: Label,
        as: 'labels'
      }, {
        model: Image,
        as: 'images'
      }]
    };

    if (folder === 'inbox') fetchQueryOptions.include.push({
      model: User,
      as: 'fromUser',
      attributes: fromUserAttributes
    });

    Recipe._validateIncludedElements(fetchQueryOptions);

    const [countResult, recipes] = await Promise.all([
      SQ.query(countQuery, countQueryOptions),
      SQ.query(fetchQuery, fetchQueryOptions)
    ]);

    let totalCount = countResult.length;
    if (countResult && countResult[0] && (countResult[0].count || countResult[0].count == 0)) {
      totalCount = parseInt(countResult[0].count, 10);
    }

    const serializedRecipes = recipes
      .map(UtilService.sortRecipeImages)
      .map(applyLegacyImageField);

    res.status(200).json({
      data: serializedRecipes,
      totalCount
    });
  }));

router.get(
  '/search',
  joiValidator(Joi.object({
    query: Joi.object({
      query: Joi.string().min(1).max(1000).required(),
      userId: Joi.string().uuid().optional(),
      labels: Joi.string().optional(),
      ratingFilter: Joi.string().regex(VALID_RATING_FILTERS).optional(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user'], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!res.locals.session && !req.query.userId) {
      throw BadRequest('You must be logged in to request this resource');
    }

    const myUserId = res.locals.session ? res.locals.session.userId : null;
    let userId = myUserId;
    const labels = req.query.labels ? req.query.labels.split(',') : [];

    // Only check for shared items if we're browsing another user's recipes
    if (req.query.userId && myUserId !== req.query.userId) {
      const user = await User.findByPk(req.query.userId);
      userId = user.id;

      let userIsFriend = false;
      if (res.locals.session) userIsFriend = await Friendship.areUsersFriends(res.locals.session.userId, userId);

      let labelId;
      if (labels.length > 1) {
        throw BadRequest('Can view maximum 1 label at a time from another user\'s profile');
      } else if (labels.length > 0) {
        const label = await Label.findOne({
          where: {
            title: labels[0],
            userId
          }
        });
        labelId = label.id;
      }

      const profileItem = await ProfileItem.findOne({
        where: {
          userId,
          ...(userIsFriend ? {} : { visibility: 'public' }),
          ...(labelId ? { type: 'label', labelId } : { type: 'all-recipes' })
        }
      });

      if (!profileItem) {
        throw NotFound('Profile item not found or not visible');
      }
    }

    const results = await ElasticService.searchRecipes(userId, req.query.query);
    const searchHits = results.hits.hits;

    const searchHitsByRecipeId = searchHits.reduce((acc, hit) => {
      acc[hit._id] = hit;
      return acc;
    }, {});

    const labelClause = {};
    if (req.query.labels) {
      labelClause.where = {
        title: labels
      };
    }

    // Rating
    const ratingClause = {};
    const ratingFilter = parseRatingFilter(req.query.ratingFilter);
    if (ratingFilter) {
      const includeNull = req.query.ratingFilter.includes('null');
      const choices = [ratingFilter];
      if (includeNull) choices.push(null);

      ratingClause.rating = {
        [Op.or]: choices
      };
    }

    const recipes = await Recipe.findAll({
      where: {
        id: { [Op.in]: Object.keys(searchHitsByRecipeId) },
        userId,
        folder: 'main',
        ...ratingClause,
      },
      include: [{
        model: Label,
        as: 'labels',
        attributes: ['id', 'title']
      }, {
        model: Label,
        as: 'label_filter',
        attributes: [],
        ...labelClause
      }, {
        model: Image,
        as: 'images',
        attributes: ['id', 'location']
      }],
      limit: 200
    });

    const serializedRecipes = recipes
      .map(UtilService.sortRecipeImages)
      .map(applyLegacyImageField)
      .sort((a, b) => {
        return searchHitsByRecipeId[b.id]._score - searchHitsByRecipeId[a.id]._score;
      });

    res.status(200).send({
      data: serializedRecipes
    });
  }));

router.get(
  '/export',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    const recipes = await Recipe.findAll({
      where: {
        userId: res.locals.session.userId,
      },
      attributes: [
        'id',
        'title',
        'description',
        'yield',
        'activeTime',
        'totalTime',
        'source',
        'url',
        'notes',
        'ingredients',
        'instructions',
        'rating',
        'folder',
        'createdAt',
        'updatedAt',
        'userId',
      ],
      include: [{
        model: User,
        as: 'fromUser',
        attributes: ['name', 'email']
      },
      {
        model: Label,
        as: 'labels',
        attributes: ['title']
      },
      {
        model: Image,
        as: 'images',
        attributes: ['id', 'location']
      }],
      order: [
        ['title', 'ASC']
      ],
    });

    const recipes_j = recipes.map(e => e.toJSON());

    let data;
    let mimetype;

    switch (req.query.format) {
    case 'json':
      data = JSON.stringify(recipes_j);
      mimetype = 'application/json';
      break;
    case 'xml':
      data = xmljs.json2xml(recipes_j, { compact: true, ignoreComment: true, spaces: 4 });
      mimetype = 'text/xml';
      break;
    case 'txt':
      data = '';

      for (let i = 0; i < recipes_j.length; i++) {
        const recipe = recipes_j[i];

        recipe.labels = recipe.labels.map(label => label.title).join(', ');

        recipe.images = recipe.images.map(image => image.location).join(', ');

        delete recipe.fromUser;

        for (const key in recipe) {
          data += key + ': ';
          data += recipe[key] + '\r\n';
        }
        data += '\r\n';
      }

      res.charset = 'UTF-8';
      mimetype = 'text/plain';
      break;
    default:
      throw BadRequest('Unknown export format. Please send json, xml, or txt.');
    }

    res.setHeader('Content-disposition', 'attachment; filename=recipes-' + Date.now() + '.' + req.query.format);
    res.setHeader('Content-type', mimetype);
    res.write(data);
    res.end();
  }));

//Get a single recipe
router.get(
  '/:recipeId',
  cors(),
  MiddlewareService.validateSession(['user'], true),
  wrapRequestWithErrorHandler(async (req, res) => {

    let recipe = await Recipe.findOne({
      where: {
        id: req.params.recipeId
      },
      include: [{
        model: User,
        as: 'fromUser',
        attributes: ['name', 'email']
      },
      {
        model: Label,
        as: 'labels',
        attributes: ['id', 'title', 'createdAt', 'updatedAt']
      },
      {
        model: Image,
        as: 'images',
        attributes: ['id', 'location']
      }],
      order: [
        ['title', 'ASC']
      ],
    });

    if (!recipe) {
      throw NotFound('Recipe with that ID not found!');
    }

    recipe = recipe.toJSON();

    recipe = UtilService.sortRecipeImages(recipe);

    recipe = applyLegacyImageField(recipe);

    recipe.isOwner = res.locals.session ? res.locals.session.userId == recipe.userId : false;

    // There should be no fromUser after recipes have been moved out of the inbox
    if (recipe.folder !== 'inbox' || !recipe.isOwner) delete recipe.fromUser;

    if (!recipe.isOwner) recipe.labels = [];

    res.status(200).json(recipe);
  }));

router.get(
  '/:recipeId/json-ld',
  cors(),
  MiddlewareService.validateSession(['user'], true),
  wrapRequestWithErrorHandler(async (req, res) => {

    let recipe = await Recipe.findOne({
      where: {
        id: req.params.recipeId
      },
      include: [{
        model: Image,
        as: 'images',
        attributes: ['id', 'location']
      }],
      order: [
        ['title', 'ASC']
      ],
    });

    if (!recipe) {
      throw NotFound('Recipe with that ID not found!');
    }

    recipe = recipe.toJSON();

    recipe = UtilService.sortRecipeImages(recipe);

    const jsonLD = JSONLDService.recipeToJSONLD(recipe);

    res.status(200).json(jsonLD);
  }));

//Update a recipe
router.put(
  '/:id',
  joiValidator(Joi.object({
    body: Joi.object({
      title: Joi.string().optional(),
      description: Joi.string().allow('').optional(),
      yield: Joi.string().allow('').optional(),
      activeTime: Joi.string().allow('').optional(),
      totalTime: Joi.string().allow('').optional(),
      source: Joi.string().allow('').optional(),
      url: Joi.string().allow('').optional(),
      notes: Joi.string().allow('').optional(),
      ingredients: Joi.string().allow('').optional(),
      instructions: Joi.string().allow('').optional(),
      rating: Joi.number().min(1).max(5).allow(null).optional(),
      folder: Joi.string().valid(...VALID_RECIPE_FOLDERS).optional(),
      imageIds: Joi.array().items(Joi.string().uuid()).optional(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user']),
  legacyImageHandler,
  wrapRequestWithErrorHandler(async (req, res) => {

    const updatedRecipe = await SQ.transaction(async transaction => {
      const recipe = await Recipe.findOne({
        where: {
          id: req.params.id,
          userId: res.locals.session.userId
        },
        transaction
      });

      if (!recipe) {
        throw NotFound('Recipe with that ID does not exist!');
      }

      if (typeof req.body.description === 'string') recipe.description = req.body.description;
      if (typeof req.body.yield === 'string') recipe.yield = req.body.yield;
      if (typeof req.body.activeTime === 'string') recipe.activeTime = req.body.activeTime;
      if (typeof req.body.totalTime === 'string') recipe.totalTime = req.body.totalTime;
      if (typeof req.body.source === 'string') recipe.source = req.body.source;
      if (typeof req.body.url === 'string') recipe.url = req.body.url;
      if (typeof req.body.notes === 'string') recipe.notes = req.body.notes;
      if (typeof req.body.ingredients === 'string') recipe.ingredients = req.body.ingredients;
      if (typeof req.body.instructions === 'string') recipe.instructions = req.body.instructions;
      if (typeof req.body.rating === 'number' || req.body.rating === null) recipe.rating = req.body.rating;
      if (typeof req.body.folder === 'string') recipe.folder = req.body.folder;

      const adjustedTitle = await Recipe.findTitle(res.locals.session.userId, recipe.id, req.body.title || recipe.title, transaction);

      recipe.title = adjustedTitle;

      const updatedRecipe = await recipe.save({
        transaction
      });

      if (req.body.imageIds) {
        const canUploadMultipleImages = await SubscriptionsService.userHasCapability(
          res.locals.session.userId,
          SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
        );

        if (!canUploadMultipleImages && req.body.imageIds.length > 1) {
          const images = await Image.findAll({
            where: {
              id: {
                [Op.in]: req.body.imageIds
              }
            },
            transaction
          });
          const imagesById = images.reduce((acc, img) => ({ ...acc, [img.id]: img }), {});

          req.body.imageIds = req.body.imageIds.filter((imageId, idx) =>
            idx === 0 || // Allow first image always (users can always upload the first image)
          imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
          moment(imagesById[imageId].createdAt).add(1, 'day').isBefore(moment()) // Allow old images (user's subscription expired)
          );
        }

        if (req.body.imageIds.length > 10) req.body.imageIds.splice(10); // Limit to 10 images per recipe max

        await Recipe_Image.destroy({
          where: {
            recipeId: recipe.id
          },
          transaction
        });

        await Recipe_Image.bulkCreate(req.body.imageIds.map((imageId, idx) => ({
          recipeId: recipe.id,
          imageId: imageId,
          order: idx
        })), {
          transaction
        });
      }

      return updatedRecipe;
    });

    res.status(200).json(updatedRecipe);
  }));

router.delete(
  '/all',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    await SQ.transaction(async (transaction) => {
      await Recipe.destroy({
        where: {
          userId: res.locals.session.userId
        },
        transaction,
      });

      await Label.destroy({
        where: {
          userId: res.locals.session.userId
        },
        transaction,
      });

      await ElasticService.deleteRecipesByUser(res.locals.session.userId);
    });

    res.status(200).send({});
  }));

const deleteRecipes = async (userId, { recipeIds, labelIds }, transaction) => {
  if (!recipeIds && !labelIds) {
    throw new Error('Must pass recipeIds or labelIds');
  }

  if (recipeIds && labelIds) {
    throw new Error('Must pass only recipeIds or labelIds');
  }

  if (!recipeIds) {
    const recipeLabels = await Recipe_Label.findAll({
      where: {
        labelId: {
          [Op.in]: labelIds,
        },
      },
      transaction,
    });

    recipeIds = [...new Set(recipeLabels.map(recipeLabel => recipeLabel.recipeId))];
  }

  const recipes = await Recipe.findAll({
    where: {
      id: { [Op.in]: recipeIds },
      userId,
    },
    attributes: ['id'],
    include: [{
      model: Label,
      as: 'labels',
      attributes: ['id'],
      include: [{
        model: Recipe,
        as: 'recipes',
        attributes: ['id']
      }]
    }],
    transaction,
  });

  if (recipes.length === 0) throw NotFound('No recipes found.');

  const nonDeletionRecipesByLabelId = {};
  recipes
    .reduce((acc, recipe) => acc.concat(recipe.labels), [])
    .map(label => {
      label.recipes.map(labelRecipe => {
        nonDeletionRecipesByLabelId[label.id] = nonDeletionRecipesByLabelId[label.id] || [];
        if (recipeIds.indexOf(labelRecipe.id) === -1)
          nonDeletionRecipesByLabelId[label.id].push(labelRecipe);
      });
    });

  // Any label with zero existing recipes after deletion
  const labelIdsToRemove = Object.entries(nonDeletionRecipesByLabelId)
    .filter(([, labelRecipes]) => labelRecipes.length === 0)
    .map(([id]) => id);

  await Recipe.destroy({
    where: {
      id: { [Op.in]: recipeIds },
      userId
    },
    transaction,
  });

  await Label.destroy({
    where: {
      id: { [Op.in]: labelIdsToRemove },
      userId
    },
    transaction,
  });
};

router.post(
  '/delete-by-labelIds',
  joiValidator(Joi.object({
    body: Joi.object({
      labelIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {
    await SQ.transaction(async (transaction) => {
      await deleteRecipes(res.locals.session.userId, {
        labelIds: req.body.labelIds,
      }, transaction);
    });

    res.sendStatus(200);
  }));

router.post(
  '/delete-bulk',
  joiValidator(Joi.object({
    body: Joi.object({
      recipeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {
    await SQ.transaction(async (transaction) => {
      await deleteRecipes(res.locals.session.userId, {
        recipeIds: req.body.recipeIds,
      }, transaction);
    });

    res.sendStatus(200);
  }));

router.delete(
  '/:id',
  joiValidator(Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  })),
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {
    await SQ.transaction(async (transaction) => {
      await deleteRecipes(res.locals.session.userId, {
        recipeIds: [req.params.id],
      }, transaction);
    });

    res.sendStatus(200);
  }));

router.post(
  '/reindex',
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {
    const recipes = await Recipe.findAll({
      where: {
        userId: res.locals.session.userId,
      }
    });

    await ElasticService.deleteRecipesByUser(res.locals.session.userId);

    await ElasticService.indexRecipes(recipes);

    res.status(200).send({});
  }));

module.exports = router;
