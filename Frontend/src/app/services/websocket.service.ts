import { Injectable } from '@angular/core';
import { UtilService } from './util.service';

/*
  Generated class for the WebsocketService provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  connection: any;
  reconnectTimeout: any;

  listeners: any = {};

  constructor(public utilService: UtilService) {
    this.connect();

    // Before tab close, cleanup WS handler and connection
    window.onbeforeunload = () => {
      try {
        this.connection.onclose = () => {};
        this.connection.close();
      } catch (e) {}
    };
  }

  isConnected() {
    if (this.connection) return true;
    return false;
  }

  // Listeners
  register(eventName, cb, ctx) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];

    this.listeners[eventName].push({
      cb,
      ctx
    });
  }

  // Outgoing
  send(msg) {
    this.connection.send(JSON.stringify(msg));
  }

  // Connection
  private connect() {
    let prot = 'ws';
    if ((window.location.href as any).indexOf('https') > -1) prot = 'wss';

    this.connection = new WebSocket(prot + '://' + window.location.hostname + '/grip/ws' + this.utilService.getTokenQuery());

    this.connection.onopen = () => {
      this.handleMessage({
        type: 'connected',
        data: null
      });
    };

    this.connection.onmessage = payload => {
      this.handleMessage(JSON.parse(payload.data));
    };

    this.connection.onerror = () => {
      if (this.connection.readyState === WebSocket.OPEN) this.connection.close();
      this.queueReconnect();
    };

    this.connection.onclose = () => {
      this.queueReconnect();
    };
  }

  public queueReconnect() {
    const RECONNECT_TIMEOUT_WAIT = 3000; // Time to wait before attempting reconnect in MS

    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      this.reconnectTimeout = null;
    }, RECONNECT_TIMEOUT_WAIT);
  }

  private handleMessage(payload) {
    this.broadcast(payload.type, payload.data);
  }

  private broadcast(eventName, msg) {
    const queue = this.listeners[eventName];

    if (!queue) return;

    for (const queueItem of queue) {
      queueItem.cb.call(queueItem.ctx, msg);
    }
  }
}
