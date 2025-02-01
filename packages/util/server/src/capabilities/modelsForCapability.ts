import { SUBSCRIPTION_MODELS } from "./constants";
import { Capabilities } from "@recipesage/util/shared";

export const modelsForCapability = (capability: Capabilities) => {
  return Object.values(SUBSCRIPTION_MODELS).filter(
    (model) => model.capabilities.indexOf(capability) > -1,
  );
};
