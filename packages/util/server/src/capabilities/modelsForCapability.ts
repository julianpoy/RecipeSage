import { Capabilities, SUBSCRIPTION_MODELS } from "./constants";

export const modelsForCapability = (capability: Capabilities) => {
  return Object.values(SUBSCRIPTION_MODELS).filter(
    (model) => model.capabilities.indexOf(capability) > -1,
  );
};
