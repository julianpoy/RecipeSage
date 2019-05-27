import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UtilServiceProvider } from '../util-service/util-service';

/*
  Generated class for the WebsocketServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class WebsocketServiceProvider {

  connection: any;
  reconnectTimeout: any;

  listeners: any = {};

  constructor(public http: HttpClient, public utilService: UtilServiceProvider) {
    this.connect();

    // Before tab close, cleanup WS handler and connection
    window.onbeforeunload = () => {
      try {
        this.connection.onclose = () => {};
        this.connection.close();
      } catch(e) {}
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
      cb: cb,
      ctx: ctx
    });
  }

  // Outgoing
  send(msg) {
    this.connection.send(JSON.stringify(msg));
  }

  // Connection
  private connect() {
    var prot = "ws";
    if ((<any>window.location.href).indexOf('https') > -1) prot = "wss";

    this.connection = new WebSocket(prot + "://" + window.location.hostname + ":7999/grip/ws" + this.utilService.getTokenQuery());

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
    var RECONNECT_TIMEOUT_WAIT = 3000; // Time to wait before attempting reconnect in MS

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
    var queue = this.listeners[eventName];

    if (!queue) return;

    for (var i = 0; i < queue.length; i++) {
      queue[i].cb.call(queue[i].ctx, msg);
    }
  }
}
