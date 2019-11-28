const moment = require('moment');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var UserSubscription = require('../models').UserSubscription;

const CAPABILITY_GRACE_PERIOD = 7;

const CAPABILITIES = {
  HIGH_RES_IMAGES: 'highResImages',
  MULTIPLE_IMAGES: 'multipleImages',
  EXPANDABLE_PREVIEWS: 'expandablePreviews'
};
exports.CAPABILITIES = CAPABILITIES;

const SUBSCRIPTION_MODELS = {
  "pyo-monthly": {
    title: "Choose your own price",
    expiresIn: 31,
    capabilities: [
      CAPABILITIES.HIGH_RES_IMAGES,
      CAPABILITIES.MULTIPLE_IMAGES,
      CAPABILITIES.EXPANDABLE_PREVIEWS
    ]
  },
  "pyo-single": {
    title: "Choose your own price - One time",
    expiresIn: 365,
    capabilities: [
      CAPABILITIES.HIGH_RES_IMAGES,
      CAPABILITIES.MULTIPLE_IMAGES,
      CAPABILITIES.EXPANDABLE_PREVIEWS
    ]
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

exports.extend = async (userId, subscriptionName, t) => {
  const renewalLength = SUBSCRIPTION_MODELS[subscriptionName].expiresIn;

  const existingSubscription = await UserSubscription.findOne({
    where: {
      userId,
      name: subscriptionName
    },
    transaction: t
  });
  if (existingSubscription) {
    const expires = moment(existingSubscription.expires || undefined).add(renewalLength, 'days');

    await UserSubscription.update(
      { expires },
      {
        where: { id: existingSubscription.id },
        transaction: t
      }
    )
  } else {
    const expires = moment().add(renewalLength, 'days');

    await UserSubscription.create({
      userId,
      name: subscriptionName,
      expires
    }, {
      transaction: t
    })
  }
}
