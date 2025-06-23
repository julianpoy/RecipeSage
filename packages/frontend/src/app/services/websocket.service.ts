import { Injectable } from "@angular/core";
import { UtilService } from "./util.service";
import { GRIP_WS_URL } from "../../environments/environment";
import { trpcClient } from "../utils/trpcClient";
import { TRPCClientError } from "@trpc/client";

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  connection: WebSocket | undefined;
  reconnectTimeout: NodeJS.Timeout | undefined;

  listeners: Record<
    string,
    {
      cb: (msg: Record<string, any>) => void;
      ctx: unknown;
    }[]
  > = {};

  constructor(public utilService: UtilService) {
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

  isConnected() {
    if (this.connection) return true;
    return false;
  }

  // Listeners
  register(
    eventName: string,
    cb: (msg: Record<string, any>) => void,
    ctx: any,
  ) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];

    this.listeners[eventName].push({
      cb,
      ctx,
    });
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

    try {
      await trpcClient.users.validateSession.query();
    } catch (e) {
      if (e instanceof TRPCClientError) {
        if (e.data?.httpStatus === 401) {
          // We break the reconnect loop until the next auth
          return;
        }
      }
      return this.queueReconnect();
    }

    let prot = "ws";
    if ((window.location.href as any).indexOf("https") > -1) prot = "wss";

    const connBaseUrl =
      GRIP_WS_URL || prot + "://" + window.location.hostname + "/grip/ws";

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
    const RECONNECT_TIMEOUT_WAIT = 2000 + Math.floor(Math.random() * 5000); // Time to wait before attempting reconnect in MS

    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(async () => {
      this.connect();
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
      queueItem.cb.call(queueItem.ctx, msg);
    }
  }
}
