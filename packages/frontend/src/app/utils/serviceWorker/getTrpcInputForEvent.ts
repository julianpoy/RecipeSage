import superjson from "superjson";
import { RouteHandlerCallbackOptions } from "workbox-core";

export const getTrpcInputForEvent = <T>(event: RouteHandlerCallbackOptions) => {
  const encodedInput = event.url.searchParams.get("input");
  if (!encodedInput) return;

  const input = superjson.parse<T>(encodedInput);

  return input;
};
