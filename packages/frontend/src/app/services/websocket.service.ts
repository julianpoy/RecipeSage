import { Injectable, inject } from "@angular/core";
import { UtilService } from "./util.service";
import { ServerActionsService } from "./server-actions.service";
import { GRIP_WS_URL } from "../../environments/environment";
import { getApiHostOverride } from "../utils/apiHostOverride";

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  utilService = inject(UtilService);
  private serverActionsService = inject(ServerActionsService);

  connection: WebSocket | undefined;
  reconnectTimeout: NodeJS.Timeout | undefined;

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
    try {
      this.connection?.close();
    } catch (e) {
      console.warn(e);
    }
    this.connect();
  }

  // Connection
  private async connect() {
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

    let prot = "ws";
    if ((window.location.href as any).indexOf("https") > -1) prot = "wss";

    const override = getApiHostOverride();
    let connBaseUrl: string;
    if (override) {
      const trimmed = override.replace(/\/$/, "");
      connBaseUrl = `${trimmed.replace(/^http/, "ws")}/grip/ws`;
    } else {
      connBaseUrl =
        GRIP_WS_URL || prot + "://" + window.location.hostname + "/grip/ws";
    }

    this.connection = new WebSocket(
      connBaseUrl + this.utilService.getTokenQuery(),
    );

    this.connection.onopen = () => {
      this.handleMessage({
        type: "connected",
      });
    };

    this.connection.onmessage = (payload: { data: string }) => {
      this.handleMessage(JSON.parse(payload.data));
    };

    this.connection.onerror = () => {
      if (this.connection?.readyState === WebSocket.OPEN)
        this.connection.close();
      this.queueReconnect();
    };

    this.connection.onclose = () => {
      this.queueReconnect();
    };
  }

  private queueReconnect() {
    const RECONNECT_TIMEOUT_WAIT = 1000 + Math.floor(Math.random() * 10000); // Time to wait before attempting reconnect in MS

    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(async () => {
      this.triggerReconnect();
      this.reconnectTimeout = undefined;
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
