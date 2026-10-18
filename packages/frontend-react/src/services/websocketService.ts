import {
  WSBroadcastEventType,
  type WSBroadcastEventData,
} from "@recipesage/util/shared";
import { usersActions } from "./server-actions/usersActions";
import { serverConfig } from "../utils/serverConfig";
import { session } from "../utils/session";

type WebsocketListener<K extends WSBroadcastEventType> = (
  msg: WSBroadcastEventData[K],
) => void;

class WebsocketService {
  private connection: WebSocket | undefined;
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private connecting = false;

  private listeners: {
    [K in WSBroadcastEventType]: Set<WebsocketListener<K>>;
  } = {
    [WSBroadcastEventType.MealPlanUpdated]: new Set(),
    [WSBroadcastEventType.ShoppingListUpdated]: new Set(),
    [WSBroadcastEventType.JobUpdated]: new Set(),
    [WSBroadcastEventType.MessageReceived]: new Set(),
  };

  constructor() {
    void this.connect();

    // Before tab close, cleanup WS handler and connection
    window.addEventListener("beforeunload", () => {
      try {
        if (this.connection) {
          this.connection.onclose = () => {};
          this.connection.close();
        }
      } catch (e) {
        console.warn(e);
      }
    });
  }

  on<K extends WSBroadcastEventType>(eventName: K, cb: WebsocketListener<K>) {
    this.listeners[eventName].add(cb);
  }

  off<K extends WSBroadcastEventType>(eventName: K, cb: WebsocketListener<K>) {
    this.listeners[eventName].delete(cb);
  }

  async triggerReconnect() {
    this.detachConnection();
    await this.connect();
  }

  private detachConnection() {
    const previous = this.connection;
    this.connection = undefined;
    if (!previous) return;

    previous.onopen = null;
    previous.onmessage = null;
    previous.onerror = null;
    previous.onclose = null;

    try {
      previous.close();
    } catch (e) {
      console.warn(e);
    }
  }

  // Connection
  private async connect() {
    if (this.connecting) return;
    this.connecting = true;

    try {
      if (!session.isLoggedIn()) return this.queueReconnect();

      let unauthorized = false;
      const validatedSession = await usersActions.validateSession({
        401: () => {
          unauthorized = true;
        },
        "*": () => {},
      });
      if (unauthorized) {
        // We break the reconnect loop until the next auth
        return;
      }
      if (!validatedSession) return this.queueReconnect();

      const connection = new WebSocket(
        serverConfig.gripWsBase + session.getTokenQuery(),
      );
      this.connection = connection;

      connection.onmessage = (payload: MessageEvent<string>) => {
        const { type, data = {} } = JSON.parse(payload.data);

        switch (type) {
          case WSBroadcastEventType.MealPlanUpdated:
            return this.emit(WSBroadcastEventType.MealPlanUpdated, data);
          case WSBroadcastEventType.ShoppingListUpdated:
            return this.emit(WSBroadcastEventType.ShoppingListUpdated, data);
          case WSBroadcastEventType.JobUpdated:
            return this.emit(WSBroadcastEventType.JobUpdated, data);
          case WSBroadcastEventType.MessageReceived:
            return this.emit(WSBroadcastEventType.MessageReceived, data);
        }
      };

      connection.onerror = () => {
        if (this.connection !== connection) return;
        if (connection.readyState === WebSocket.OPEN) connection.close();
        this.queueReconnect();
      };

      connection.onclose = () => {
        if (this.connection !== connection) return;
        this.queueReconnect();
      };
    } finally {
      this.connecting = false;
    }
  }

  private queueReconnect() {
    const RECONNECT_TIMEOUT_WAIT = 1000 + Math.floor(Math.random() * 10000); // Time to wait before attempting reconnect in MS

    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = undefined;
      await this.triggerReconnect();
    }, RECONNECT_TIMEOUT_WAIT);
  }

  private emit<K extends WSBroadcastEventType>(
    eventName: K,
    msg: WSBroadcastEventData[K],
  ) {
    for (const listener of this.listeners[eventName]) {
      listener(msg);
    }
  }
}

export const websocketService = new WebsocketService();
