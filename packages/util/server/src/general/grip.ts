import { Publisher, WebSocketMessageFormat } from "@fanoutio/grip";
import { ServeGrip } from "@fanoutio/serve-grip/node";
import { config, Environment } from "./config";
import { metrics } from "./metrics";
import {
  WSBroadcastEventType,
  type WSBroadcastEventData,
} from "@recipesage/util/shared";

const fetchWithoutContentLength: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.delete("Content-Length");

  return fetch(input, {
    ...init,
    headers,
  });
};

export const serveGrip = new ServeGrip({
  grip: new Publisher(
    [
      {
        control_uri: config.grip.url,
        key: config.grip.key,
      },
    ],
    {
      fetch: fetchWithoutContentLength,
    },
  ),
});

export { WSBroadcastEventType, type WSBroadcastEventData };

export const broadcastWSEvent = async function <T extends WSBroadcastEventType>(
  channel: string,
  type: T,
  data: WSBroadcastEventData[T],
) {
  if (config.environment === Environment.Test) return;

  const body = {
    type: type,
    data: data || {},
  };

  const publisher = serveGrip.getPublisher();
  await publisher.publishFormats(
    channel,
    new WebSocketMessageFormat(JSON.stringify(body)),
  );

  metrics.websocketMessageOutgoing.inc({
    message_type: type,
  });
};

export const broadcastWSEventIgnoringErrors = async function <
  T extends WSBroadcastEventType,
>(channel: string, type: T, data: WSBroadcastEventData[T]) {
  try {
    await broadcastWSEvent(channel, type, data);
  } catch (e) {
    metrics.websocketBroadcastFailed.inc({
      message_type: type,
    });
    console.warn(e);
  }
};
