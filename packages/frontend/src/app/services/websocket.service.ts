import { Injectable, inject } from "@angular/core";
import { UtilService } from "./util.service";
import { ServerActionsService } from "./server-actions.service";
import { serverConfig } from "../utils/serverConfig";

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  utilService = inject(UtilService);
  private serverActionsService = inject(ServerActionsService);

  connection: WebSocket | undefined;
  reconnectTimeout: NodeJS.Timeout | undefined;
  private connecting = false;

  listeners: Record<string, Set<(msg: Record<string, any>) => void>> = {};

  constructor() {
    this.connect();

    // Before tab close, cleanup WS handler and connection
    window.addEventListener("beforeunload", () => {
      try {
        if (this.connection) {
          this.connection.onclose = () => {};
          this.connection.close();
        }
      } catch (e) {}
    });
  }

  on(eventName: string, cb: (msg: Record<string, any>) => void) {
    let listeners = this.listeners[eventName];
    if (!listeners) {
      listeners = new Set();
      this.listeners[eventName] = listeners;
    }

    listeners.add(cb);
  }

  off(eventName: string, cb: (msg: Record<string, any>) => void) {
    const listeners = this.listeners[eventName];
    if (!listeners) return;

    listeners.delete(cb);
  }

  // Outgoing
  send(msg: Record<string, any>) {
    this.connection?.send(JSON.stringify(msg));
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
      if (!this.utilService.isLoggedIn()) return this.queueReconnect();

      let unauthorized = false;
      const session = await this.serverActionsService.users.validateSession({
        401: () => {
          unauthorized = true;
        },
        "*": () => {},
      });
      if (unauthorized) {
        // We break the reconnect loop until the next auth
        return;
      }
      if (!session) return this.queueReconnect();

      const connection = new WebSocket(
        serverConfig.gripWsBase + this.utilService.getTokenQuery(),
      );
      this.connection = connection;

      connection.onopen = () => {
        this.handleMessage({
          type: "connected",
        });
      };

      connection.onmessage = (payload: { data: string }) => {
        this.handleMessage(JSON.parse(payload.data));
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

  private handleMessage(payload: { type: string; data?: Record<string, any> }) {
    this.broadcast(payload.type, payload.data);
  }

  private broadcast(eventName: string, msg: Record<string, any> = {}) {
    const queue = this.listeners[eventName];

    if (!queue) return;

    for (const queueItem of queue) {
      queueItem(msg);
    }
  }
}
