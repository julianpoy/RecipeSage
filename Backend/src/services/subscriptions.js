const moment = require('moment');

// DB
const Op = require('sequelize').Op;
const UserSubscription = require('../models').UserSubscription;

const CAPABILITY_GRACE_PERIOD = 7;

const CAPABILITIES = {
  HIGH_RES_IMAGES: 'highResImages',
  MULTIPLE_IMAGES: 'multipleImages',
  EXPANDABLE_PREVIEWS: 'expandablePreviews'
};
exports.CAPABILITIES = CAPABILITIES;

const SUBSCRIPTION_MODELS = {
  'pyo-monthly': {
    title: 'Choose your own price',
    expiresIn: 31,
    capabilities: [
      CAPABILITIES.HIGH_RES_IMAGES,
      CAPABILITIES.MULTIPLE_IMAGES,
      CAPABILITIES.EXPANDABLE_PREVIEWS
    ]
  },
  'pyo-single': {
    title: 'Choose your own price - One time',
    expiresIn: 365,
    capabilities: [
      CAPABILITIES.HIGH_RES_IMAGES,
      CAPABILITIES.MULTIPLE_IMAGES,
      CAPABILITIES.EXPANDABLE_PREVIEWS
    ]
  },
  'forever': {
    title: 'The Forever Subscription...',
    expiresIn: 3650, // 10 years - okay, not quite forever
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
};

exports.subscriptionsForUser = async (userId, includeExpired) => {
  // Allow users to continue to access expired features for grace period
  const mustBeValidUntil = includeExpired ? moment(new Date('1980')) : moment().subtract(CAPABILITY_GRACE_PERIOD, 'days');

  return UserSubscription.findAll({
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
};

exports.capabilitiesForSubscription = subscriptionName => {
  return SUBSCRIPTION_MODELS[subscriptionName].capabilities;
};

exports.capabilitiesForUser = async userId => {
  const activeSubscriptions = await exports.subscriptionsForUser(userId);

  return activeSubscriptions.reduce((acc, activeSubscription) => {
    const capabilities = exports.capabilitiesForSubscription(activeSubscription.name);
    return [
      ...acc,
      ...capabilities
    ];
  }, []);
};

exports.userHasCapability = async (userId, capability) => {
  const capabilities = await exports.capabilitiesForUser(userId);
  return capabilities.indexOf(capability) > -1;
};

exports.extend = async (userId, subscriptionName, transaction) => {
  const renewalLength = SUBSCRIPTION_MODELS[subscriptionName].expiresIn;

  const existingSubscription = await UserSubscription.findOne({
    where: {
      userId,
      name: subscriptionName
    },
    transaction,
  });
  if (existingSubscription) {
    const expires = moment(existingSubscription.expires || undefined).add(renewalLength, 'days');

    await UserSubscription.update(
      { expires },
      {
        where: { id: existingSubscription.id },
        transaction,
      }
    );
  } else {
    const expires = moment().add(renewalLength, 'days');

    await UserSubscription.create({
      userId,
      name: subscriptionName,
      expires
    }, {
      transaction,
    });
  }
};
