const moment = require('moment');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var UserSubscription = require('../models').UserSubscription;

const CAPABILITY_GRACE_PERIOD = 7;
const SUBSCRIPTION_EXTENSION_PERIOD = 31;

const CAPABILITIES = {
  HIGH_RES_IMAGES: 'highResImages',
  MULTIPLE_IMAGES: 'multipleImages',
  EXPANDABLE_PREVIEWS: 'expandablePreviews'
};
exports.CAPABILITIES = CAPABILITIES;

const SUBSCRIPTION_MODELS = {
  "pyo-monthly": {
    title: "Choose your own price",
    capabilities: [
      CAPABILITIES.HIGH_RES_IMAGES,
      CAPABILITIES.MULTIPLE_IMAGES,
      CAPABILITIES.EXPANDABLE_PREVIEWS
    ]
  },
  "pyo-single": {
    title: "Choose your own price - One time",
    capabilities: []
  }
};

exports.modelsForCapability = capability => {
  return Object.keys(SUBSCRIPTION_MODELS)
    .map(modelName => SUBSCRIPTION_MODELS[modelName])
    .filter(model => model.capabilities.indexOf(capability) > -1);
}

exports.capabilitiesForUser = async userId => {
  // Allow users to continue to access expired features for grace period
  const mustBeValidUntil = moment().add(CAPABILITY_GRACE_PERIOD, 'days');

  const activeSubscriptions = await UserSubscription.findAll({
    where: {
      userId,
      name: { [Op.ne]: null },
      expires: {
        [Op.or]: [
          { [Op.gte]: mustBeValidUntil },
          null
        ]
      }
    }
  });

  return activeSubscriptions.reduce((acc, activeSubscription) => {
    const capabilities = SUBSCRIPTION_MODELS[activeSubscription.name].capabilities;
    return [
      ...acc,
      ...capabilities
    ]
  }, [])
}

exports.userHasCapability = async (userId, capability) => {
  const capabilities = await exports.capabilitiesForUser(userId);
  return capabilities.indexOf(capability) > -1;
}

exports.extend = async (userId, subscriptionName, expires, t) => {
  const existingSubscription = await UserSubscription.findOne({
    where: {
      userId,
      name: subscriptionName
    },
    transaction: t
  });
  if (existingSubscription) {
    await UserSubscription.update(
      { expires: expires === false ? null : moment(existingSubscription.expires || undefined).add(SUBSCRIPTION_EXTENSION_PERIOD, 'days') },
      {
        where: { id: existingSubscription.id },
        transaction: t
      }
    )
  } else {
    await UserSubscription.create({
      userId,
      name: subscriptionName,
      expires: expires === false ? null : moment().add(SUBSCRIPTION_EXTENSION_PERIOD, 'days')
    }, {
      transaction: t
    })
  }
}
