import { Injectable } from "@angular/core";
import { UtilService } from "./util.service";
import { GRIP_WS_URL } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  connection: any;
  reconnectTimeout: any;

  listeners: any = {};

  constructor(public utilService: UtilService) {
    this.connect();

    // Before tab close, cleanup WS handler and connection
    window.addEventListener("beforeunload", () => {
      try {
        this.connection.onclose = () => {};
        this.connection.close();
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
    cb: (payload: Record<string, any>) => void,
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
    this.connection.send(JSON.stringify(msg));
  }

  // Connection
  private connect() {
    if (!this.utilService.isLoggedIn()) return this.queueReconnect();

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
      if (this.connection.readyState === WebSocket.OPEN)
        this.connection.close();
      this.queueReconnect();
    };

    this.connection.onclose = () => {
      this.queueReconnect();
    };
  }

  public queueReconnect() {
    const RECONNECT_TIMEOUT_WAIT = 2000 + Math.floor(Math.random() * 2000); // Time to wait before attempting reconnect in MS

    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      this.reconnectTimeout = null;
    }, RECONNECT_TIMEOUT_WAIT);
  }

  private handleMessage(payload: { type: string; data?: Record<string, any> }) {
    this.broadcast(payload.type, payload.data);
  }

  private broadcast(eventName: string, msg?: Record<string, any>) {
    const queue = this.listeners[eventName];

    if (!queue) return;

    for (const queueItem of queue) {
      queueItem.cb.call(queueItem.ctx, msg);
    }
  }
}
