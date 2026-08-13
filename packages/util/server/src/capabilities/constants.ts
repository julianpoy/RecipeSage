import { Capabilities } from "@recipesage/util/shared";

export const CAPABILITY_GRACE_PERIOD = 7;
export const MULTIPLE_IMAGES_UNLOCKED_LIMIT = 10;

export enum SubscriptionModelName {
  PyoMonthly = "pyo-monthly",
  PyoYearly = "pyo-yearly",
  PyoSingle = "pyo-single",
  Forever = "forever",
}

export const SUBSCRIPTION_MODELS = {
  [SubscriptionModelName.PyoMonthly]: {
    title: "Choose your own price",
    expiresIn: 31,
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
      Capabilities.MoreUsageCredits,
    ],
  },
  [SubscriptionModelName.PyoYearly]: {
    title: "Choose your own price - Yearly",
    expiresIn: 365,
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
      Capabilities.MoreUsageCredits,
    ],
  },
  [SubscriptionModelName.PyoSingle]: {
    title: "Choose your own price - One time",
    expiresIn: 365,
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
      Capabilities.MoreUsageCredits,
    ],
  },
  [SubscriptionModelName.Forever]: {
    title: "The Forever Subscription...",
    expiresIn: 3650, // 10 years - okay, not quite forever
    capabilities: [
      Capabilities.HighResImages,
      Capabilities.MultipleImages,
      Capabilities.ExpandablePreviews,
      Capabilities.AssistantMoreMessages,
      Capabilities.MoreUsageCredits,
    ],
  },
};
