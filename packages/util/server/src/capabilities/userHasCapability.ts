import { capabilitiesForUser } from "./capabilitiesForUser";
import { Capabilities } from "@recipesage/util/shared";

export const userHasCapability = async (
  userId: string,
  capability: Capabilities,
) => {
  const capabilities = await capabilitiesForUser(userId);
  return capabilities.includes(capability);
};
