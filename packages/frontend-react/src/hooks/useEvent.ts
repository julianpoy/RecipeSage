import { useEffect, useEffectEvent } from "react";
import { events, type EventListener, type EventName } from "../services/events";

export const useEvent = (
  eventNames: EventName | EventName[],
  listener: EventListener,
) => {
  const onEvent = useEffectEvent((data?: unknown) => listener(data));

  useEffect(() => {
    const handler: EventListener = (data) => onEvent(data);
    events.subscribe(eventNames, handler);
    return () => events.unsubscribe(eventNames, handler);
  }, [eventNames]);
};
