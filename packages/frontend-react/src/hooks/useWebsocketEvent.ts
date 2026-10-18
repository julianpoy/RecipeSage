import { useEffect, useEffectEvent } from "react";
import type {
  WSBroadcastEventData,
  WSBroadcastEventType,
} from "@recipesage/util/shared";
import { websocketService } from "../services/websocketService";

export const useWebsocketEvent = <K extends WSBroadcastEventType>(
  eventName: K,
  listener: (msg: WSBroadcastEventData[K]) => void,
) => {
  const onMessage = useEffectEvent((msg: WSBroadcastEventData[K]) =>
    listener(msg),
  );

  useEffect(() => {
    const handler = (msg: WSBroadcastEventData[K]) => onMessage(msg);
    websocketService.on(eventName, handler);
    return () => websocketService.off(eventName, handler);
  }, [eventName]);
};
