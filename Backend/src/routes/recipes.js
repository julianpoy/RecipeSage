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
  cors(),
  MiddlewareService.validateSession(['user']),
  legacyImageHandler,
  async (req, res, next) => {

    if (!req.body.title || req.body.title.length === 0) {
      return res.status(412).send('Recipe title must be provided.');
    }

    // If sending to another user, folder should be inbox. Otherwise, main.
    let folder = req.body.destinationUserEmail ? 'inbox' : 'main';

    SQ.transaction(async transaction => {
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
        folder: folder
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

      if (req.body.labels && req.body.labels.length > 0 && !req.body.destinationUserEmail) {
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
          throw new Error('Labels length did not match labelTitles length. Orphaned labels!');
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
    }).then(recipe => {
      const serializedRecipe = recipe.toJSON();
      serializedRecipe.labels = [];
      res.status(201).json(serializedRecipe);
    }).catch(next);
  });

// Count a user's recipes
router.get(
  '/count',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    Recipe.count({
      where: {
        userId: res.locals.session.userId,
        folder: req.query.folder || 'main'
      }
    }).then(count => {
      res.status(200).json({
        count
      });
    }).catch(next);
  });

//Get all of a user's recipes (paginated)
router.get(
  '/by-page',
  cors(),
  MiddlewareService.validateSession(['user'], true),
  async (req, res, next) => {
    try {
      if (!res.locals.session && !req.query.userId) {
        const mustBeLoggedInError = new Error('You must be logged in to request this resource');
        mustBeLoggedInError.status = 401;
        throw mustBeLoggedInError;
      }

      const myUserId = res.locals.session ? res.locals.session.userId : null;
      let userId = myUserId;
      let folder = req.query.folder || 'main';
      let labelFilter = req.query.labels ? req.query.labels.split(',') : [];

      // Only check for shared items if we're browsing another user's recipes
      if (req.query.userId && myUserId !== req.query.userId) {
        const user = await User.findByPk(req.query.userId);
        userId = user.id;

        let userIsFriend = false;
        if (res.locals.session) userIsFriend = await Friendship.areUsersFriends(res.locals.session.userId, userId);

        let labelId;
        if (labelFilter.length > 1) {
          const tooManyLabelsErr = new Error('Can view maximum 1 label at a time from another user\'s profile');
          tooManyLabelsErr.status = 400;
          return next(tooManyLabelsErr);
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
          const profileItemNotFound = new Error('Profile item not found or not visible');
          profileItemNotFound.status = 404;
          return next(profileItemNotFound);
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

      const recipeAttributes = ['id', 'title', 'description', 'source', 'url', 'folder', 'fromUserId', 'createdAt', 'updatedAt'];
      const labelAttributes = ['id', 'title'];
      const imageAttributes = ['id', 'location'];
      const recipeImageAttributes = ['id', 'order'];
      const fromUserAttributes = ['name', 'email'];

      const recipeSelect = recipeAttributes.map(el => `"Recipe"."${el}" AS "${el}"`).join(', ');
      const labelSelect = labelAttributes.map(el => `"Label"."${el}" AS "labels.${el}"`).join(', ');
      const imageSelect = imageAttributes.map(el => `"Image"."${el}" AS "images.${el}"`).join(', ');
      const recipeImageSelect = recipeImageAttributes.map(el => `"Recipe_Image"."${el}" AS "images.Recipe_Image.${el}"`).join(', ');
      const fromUserSelect = fromUserAttributes.map(el => `"FromUser"."${el}" AS "fromUser.${el}"`).join(', ');
      let fields = `${recipeSelect}, ${labelSelect}, ${imageSelect}, ${recipeImageSelect}`;
      if (folder === 'inbox') fields += `, ${fromUserSelect}`;

      const labelFilterClause = `"Label".title IN (${ Object.keys(labelFilterMap).map(e => `$${e}`).join(',') })`;
      const labelIntersectionClause = req.query.labelIntersection === 'true' ? `HAVING count("Label") = ${labelFilter.length}` : '';
      const unlabeledClause = unlabeledOnly ? 'AND "Label".id IS NULL' : '';
      const unlabeledJoin = unlabeledOnly ? `
        LEFT OUTER JOIN "Recipe_Labels" AS "Recipe_Label" ON "Recipe_Label"."recipeId" = "Recipe".id
        LEFT OUTER JOIN "Labels" AS "Label" ON "Label".id = "Recipe_Label"."labelId"
      `: '';

      const countQuery = labelFilter.length > 0 ?
        `SELECT "Recipe".id
        FROM "Recipe_Labels" "Recipe_Label", "Recipes" "Recipe", "Labels" "Label"
        WHERE "Recipe_Label"."labelId" = "Label".id
        AND ${labelFilterClause}
        AND "Recipe".id = "Recipe_Label"."recipeId"
        AND "Recipe"."userId" = $userId
        AND "Recipe"."folder" = $folder
        GROUP BY "Recipe".id
        ${labelIntersectionClause}`
        :
        `SELECT count("Recipe".id)
        FROM "Recipes" AS "Recipe"
        ${unlabeledJoin}
        WHERE "Recipe"."userId" = $userId
        AND "Recipe"."folder" = $folder
        ${unlabeledClause}`;

      const fetchQuery = labelFilter.length > 0 ?
        `SELECT ${fields} from (SELECT "Recipe".id
        FROM "Recipe_Labels" "Recipe_Label", "Recipes" "Recipe", "Labels" "Label"
        WHERE "Recipe_Label"."labelId" = "Label".id
        AND ${labelFilterClause}
        AND "Recipe".id = "Recipe_Label"."recipeId"
        AND "Recipe"."userId" = $userId
        AND "Recipe"."folder" = $folder
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
          ...labelFilterMap
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
          ...labelFilterMap
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

      Promise.all([
        SQ.query(countQuery, countQueryOptions),
        SQ.query(fetchQuery, fetchQueryOptions)
      ]).then(([countResult, recipes]) => {
        let totalCount = countResult.length;
        if (countResult && countResult[0] && (countResult[0].count || countResult[0].count == 0)) {
          totalCount = parseInt(countResult[0].count, 10);
        }

        recipes = recipes.map(UtilService.sortRecipeImages);

        recipes = recipes.map(applyLegacyImageField);

        res.status(200).json({
          data: recipes,
          totalCount
        });
      }).catch(next);
    } catch(err) {
      next(err);
    }
  }
);

router.get(
  '/search',
  cors(),
  MiddlewareService.validateSession(['user'], true),
  async (req, res, next) => {
    try {
      if (!res.locals.session && !req.query.userId) {
        const mustBeLoggedInError = new Error('You must be logged in to request this resource');
        mustBeLoggedInError.status = 400;
        throw mustBeLoggedInError;
      }

      const myUserId = res.locals.session ? res.locals.session.userId : null;
      let userId = myUserId;
      let labels = req.query.labels ? req.query.labels.split(',') : [];

      // Only check for shared items if we're browsing another user's recipes
      if (req.query.userId && myUserId !== req.query.userId) {
        const user = await User.findByPk(req.query.userId);
        userId = user.id;

        let userIsFriend = false;
        if (res.locals.session) userIsFriend = await Friendship.areUsersFriends(res.locals.session.userId, userId);

        let labelId;
        if (labels.length > 1) {
          const tooManyLabelsErr = new Error('Can view maximum 1 label at a time from another user\'s profile');
          tooManyLabelsErr.status = 400;
          return next(tooManyLabelsErr);
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
          const profileItemNotFound = new Error('Profile item not found or not visible');
          profileItemNotFound.status = 404;
          return next(profileItemNotFound);
        }
      }

      ElasticService.searchRecipes(userId, req.query.query).then(results => {
        let searchHits = results.hits.hits;

        let searchHitsByRecipeId = searchHits.reduce((acc, hit) => {
          acc[hit._id] = hit;
          return acc;
        }, {});

        let labelFilter = {};
        if (req.query.labels) {
          labelFilter.where = {
            title: labels
          };
        }

        return Recipe.findAll({
          where: {
            id: { [Op.in]: Object.keys(searchHitsByRecipeId) },
            userId,
            folder: 'main'
          },
          include: [{
            model: Label,
            as: 'labels',
            attributes: ['id', 'title']
          }, {
            model: Label,
            as: 'label_filter',
            attributes: [],
            ...labelFilter
          }, {
            model: Image,
            as: 'images',
            attributes: ['id', 'location']
          }],
          limit: 200
        }).then(recipes => {
          recipes = recipes.map(UtilService.sortRecipeImages);

          recipes = recipes.map(applyLegacyImageField);

          res.status(200).send({
            data: recipes.sort((a, b) => {
              return searchHitsByRecipeId[b.id]._score - searchHitsByRecipeId[a.id]._score;
            })
          });
        });
      }).catch(next);
    } catch(err) {
      next(err);
    }
  }
);

router.get(
  '/export',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    Recipe.findAll({
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
    }).then(function(recipes) {
      let recipes_j = recipes.map(e => e.toJSON());

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
          let recipe = recipes_j[i];

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
        res.status(400).send('Unknown export format. Please send json, xml, or txt.');
        return;
      }

      res.setHeader('Content-disposition', 'attachment; filename=recipes-' + Date.now() + '.' + req.query.format);
      res.setHeader('Content-type', mimetype);
      res.write(data);
      res.end();
    }).catch(next);
  });

//Get a single recipe
router.get(
  '/:recipeId',
  cors(),
  MiddlewareService.validateSession(['user'], true),
  function(req, res, next) {

    Recipe.findOne({
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
    }).then(function(recipe) {
      if (!recipe) {
        res.status(404).send('Recipe with that ID not found!');
      } else {
        recipe = recipe.toJSON();

        recipe = UtilService.sortRecipeImages(recipe);

        recipe = applyLegacyImageField(recipe);

        recipe.isOwner = res.locals.session ? res.locals.session.userId == recipe.userId : false;

        // There should be no fromUser after recipes have been moved out of the inbox
        if (recipe.folder !== 'inbox' || !recipe.isOwner) delete recipe.fromUser;

        if (!recipe.isOwner) recipe.labels = [];

        res.status(200).json(recipe);
      }
    }).catch(next);
  });

router.get(
  '/:recipeId/json-ld',
  cors(),
  MiddlewareService.validateSession(['user'], true),
  async (req, res, next) => {
    try {

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
        return res.status(404).send('Recipe with that ID not found!');
      }

      recipe = recipe.toJSON();

      recipe = UtilService.sortRecipeImages(recipe);

      const jsonLD = JSONLDService.recipeToJSONLD(recipe);

      res.status(200).json(jsonLD);
    } catch(e) {
      next(e);
    }
  }
);

//Update a recipe
router.put(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  legacyImageHandler,
  async (req, res, next) => {

    SQ.transaction(async transaction => {
      const recipe = await Recipe.findOne({
        where: {
          id: req.params.id,
          userId: res.locals.session.userId
        },
        transaction
      });

      if (!recipe) {
        return res.status(404).json({
          msg: 'Recipe with that ID does not exist!'
        });
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
    }).then(updatedRecipe => {
      res.status(200).json(updatedRecipe);
    }).catch(next);
  });

router.delete(
  '/all',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    SQ.transaction(t => {
      return Recipe.destroy({
        where: {
          userId: res.locals.session.userId
        },
        transaction: t
      }).then(() => {
        return Label.destroy({
          where: {
            userId: res.locals.session.userId
          },
          transaction: t
        });
      }).then(() => {
        return ElasticService.deleteRecipesByUser(res.locals.session.userId);
      });
    }).then(() => {
      res.status(200).send({});
    }).catch(next);
  });

router.post(
  '/delete-bulk',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {
    SQ.transaction(t => {
      return Recipe.findAll({
        where: {
          id: { [Op.in]: req.body.recipeIds },
          userId: res.locals.session.userId
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
        transaction: t
      }).then(recipes => {
        let nonDeletionRecipesByLabelId = {};
        recipes.reduce((acc, recipe) => acc.concat(recipe.labels), [])
          .map(label => {
            label.recipes.map(labelRecipe => {
              nonDeletionRecipesByLabelId[label.id] = nonDeletionRecipesByLabelId[label.id] || [];
              if (req.body.recipeIds.indexOf(labelRecipe.id) === -1)
                nonDeletionRecipesByLabelId[label.id].push(labelRecipe);
            });
          });

        // Any recipe with zero existing recipes after deletion
        let labelIdsToRemove = Object.entries(nonDeletionRecipesByLabelId)
          .filter(([, labelRecipes]) => labelRecipes.length === 0)
          .map(([id]) => id);

        return Promise.all([
          Recipe.destroy({
            where: {
              id: { [Op.in]: req.body.recipeIds },
              userId: res.locals.session.userId
            },
            transaction: t
          }),
          Label.destroy({
            where: {
              id: { [Op.in]: labelIdsToRemove },
              userId: res.locals.session.userId
            },
            transaction: t
          })
        ]);
      });
    }).then(() => {
      res.status(200).json({});
    }).catch(next);
  }
);

router.delete(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    Recipe.findOne({
      where: {
        id: req.params.id,
        userId: res.locals.session.userId
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
      }]
    })
      .then(function(recipe) {
        if (!recipe) {
          res.status(404).json({
            msg: 'Recipe with specified ID does not exist!'
          });
        } else {
          return SQ.transaction(function(t) {
            return recipe.destroy({transaction: t}).then(function() {
              // Get an array of labelIds which have only this recipe associated
              const labelIds = recipe.labels.reduce(function(acc, label) {
                if (label.recipes.length <= 1) {
                  acc.push(label.id);
                }
                return acc;
              }, []);

              return Label.destroy({
                where: {
                  id: { [Op.in]: labelIds }
                },
                transaction: t
              });
            });
          }).then(() => {
            res.status(200).json(recipe);
          });
        }
      })
      .catch(next);
  });

router.post('/reindex', MiddlewareService.validateSession(['user']), async (req, res) => {
  const recipes = await Recipe.findAll({
    where: {
      userId: res.locals.session.userId,
    }
  });

  await ElasticService.deleteRecipesByUser(res.locals.session.userId);

  await ElasticService.indexRecipes(recipes);

  res.status(200).send({});
});

module.exports = router;
