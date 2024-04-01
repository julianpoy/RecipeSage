import { WebSocketMessageFormat } from "@fanoutio/grip";
import { ServeGrip } from "@fanoutio/serve-grip";
import { config } from "./config";

export const serveGrip = new ServeGrip({
  grip: [
    {
      control_uri: config.grip.url,
      key: config.grip.key,
    },
  ],
});

export enum WSBoardcastEventType {
  MealPlanUpdated = "mealplan:updated",
}

export type WSBoardcastEventData = {
  [WSBoardcastEventType.MealPlanUpdated]: {
    reference: string;
    mealPlanId: string;
  };
};

export const broadcastWSEvent = function <T extends WSBoardcastEventType>(
  channel: string,
  type: T,
  data: WSBoardcastEventData[T],
) {
  if (process.env.NODE_ENV === "test") return;

  const body = {
    type: type,
    data: data || {},
  };

  const publisher = serveGrip.getPublisher();
  publisher.publishFormats(
    channel,
    new WebSocketMessageFormat(JSON.stringify(body)),
  );
};
