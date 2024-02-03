import * as moment from "moment";
import {
  subscriptionsForUser as _subscriptionsForUser,
  capabilitiesForUser as _capabilitiesForUser,
  capabilitiesForSubscription as _capabilitiesForSubscription,
  userHasCapability as _userHasCapability,
  Capabilities as _Capabilities,
  SubscriptionModels as _SubscriptionModels,
  SUBSCRIPTION_MODELS,
} from "@recipesage/trpc";

// DB
import { UserSubscription } from "../models/index.js";

export const subscriptionsForUser = _subscriptionsForUser;
export const capabilitiesForUser = _capabilitiesForUser;
export const capabilitiesForSubscription = _capabilitiesForSubscription;
export const userHasCapability = _userHasCapability;
export const SubscriptionModels = _SubscriptionModels;
export const Capabilities = _Capabilities;

export const extend = async (userId, subscriptionName, transaction) => {
  const renewalLength = SUBSCRIPTION_MODELS[subscriptionName].expiresIn;

  const existingSubscription = await UserSubscription.findOne({
    where: {
      userId,
      name: subscriptionName,
    },
    transaction,
  });
  if (existingSubscription) {
    const expires = moment(existingSubscription.expires || undefined).add(
      renewalLength,
      "days",
    );

    await UserSubscription.update(
      { expires },
      {
        where: { id: existingSubscription.id },
        transaction,
      },
    );
  } else {
    const expires = moment().add(renewalLength, "days");

    await UserSubscription.create(
      {
        userId,
        name: subscriptionName,
        expires,
      },
      {
        transaction,
      },
    );
  }
};
