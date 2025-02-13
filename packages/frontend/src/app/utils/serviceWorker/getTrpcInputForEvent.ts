import { RouteHandlerCallbackOptions } from "workbox-core";

export const getTrpcInputForEvent = <T>(
  event: RouteHandlerCallbackOptions,
): T | undefined => {
  const encodedInput = event.url.searchParams.get("input");
  if (!encodedInput) return;

  const input = JSON.parse(encodedInput);

  return input;
};
