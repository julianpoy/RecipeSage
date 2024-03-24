import { capabilitiesForUser } from "./capabilitiesForUser";
import { Capabilities } from "./constants";

export const userHasCapability = async (
  userId: string,
  capability: Capabilities,
) => {
  const capabilities = await capabilitiesForUser(userId);
  return capabilities.includes(capability);
};
