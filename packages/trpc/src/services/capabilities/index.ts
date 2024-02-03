import { prisma } from "@recipesage/prisma";
import * as moment from "moment";

const CAPABILITY_GRACE_PERIOD = 7;
export const MULTIPLE_IMAGES_UNLOCKED_LIMIT = 10;

export enum Capabilities {
  HighResImages = "highResImages",
  MultipleImages = "multipleImages",
  ExpandablePreviews = "expandablePreviews",
  AssistantMoreMessages = "assistantMoreMessages",
}

export enum SubscriptionModels {
  PyoMonthly = "pyo-monthly",
  PyoSingle = "pyo-single",
  Forever = "forever",
}

export const SUBSCRIPTION_MODELS = {
  [SubscriptionModels.PyoMonthly]: {
    title: "Choose your own price",
    expiresIn: 31,
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
    ],
  },
  [SubscriptionModels.PyoSingle]: {
    title: "Choose your own price - One time",
    expiresIn: 365,
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
    ],
  },
  [SubscriptionModels.Forever]: {
    title: "The Forever Subscription...",
    expiresIn: 3650, // 10 years - okay, not quite forever
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
    ],
  },
};

export const modelsForCapability = (capability: Capabilities) => {
  return Object.values(SUBSCRIPTION_MODELS).filter(
    (model) => model.capabilities.indexOf(capability) > -1,
  );
};

export const subscriptionsForUser = async (
  userId: string,
  includeExpired?: boolean,
) => {
  // Allow users to continue to access expired features for grace period
  const mustBeValidUntil = includeExpired
    ? moment(new Date("1980"))
    : moment().subtract(CAPABILITY_GRACE_PERIOD, "days");

  const subscriptions = prisma.userSubscription.findMany({
    where: {
      userId,
      name: {
        not: null,
      },
      OR: [
        {
          expires: {
            gte: mustBeValidUntil.toDate(),
          },
        },
        {
          expires: null,
        },
      ],
    },
  });

  return subscriptions;
};

export const capabilitiesForSubscription = (
  subscriptionName: SubscriptionModels,
) => {
  return SUBSCRIPTION_MODELS[subscriptionName].capabilities;
};

export const capabilitiesForUser = async (userId: string) => {
  const activeSubscriptions = await subscriptionsForUser(userId);

  return activeSubscriptions.reduce((acc, activeSubscription) => {
    const capabilities = capabilitiesForSubscription(
      activeSubscription.name as SubscriptionModels,
    );
    return [...acc, ...capabilities];
  }, [] as Capabilities[]);
};

export const userHasCapability = async (
  userId: string,
  capability: Capabilities,
) => {
  const capabilities = await capabilitiesForUser(userId);
  return capabilities.includes(capability);
};
