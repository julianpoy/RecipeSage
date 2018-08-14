import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

/*
  Generated class for the WebsocketServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class WebsocketServiceProvider {

  connection: any;

  listeners: any = {};

  constructor(public http: HttpClient) {
    console.log('Hello WebsocketServiceProvider Provider');

    this.connect();

    var me = this;
    // Before tab close, cleanup WS handler and connection
    window.onbeforeunload = function() {
      try {
        me.connection.onclose = function() {};
        me.connection.close();
      } catch(e) {}
    };
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }

  isConnected() {
    if (this.connection) return true;
    return false;
  }

  // Listeners
  register(eventName, fn, ctx) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];

    this.listeners[eventName].push({
      cb: fn,
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

    this.connection = new WebSocket(prot + "://" + window.location.hostname + ":7999/grip/ws" + this.getTokenQuery());

    var me = this;
    this.connection.onopen = function() {
      me.handleMessage({
        type: 'connected',
        message: null
      });
    };

    this.connection.onmessage = function(payload) {
      me.handleMessage(payload.data);
    };

    this.connection.onerror = function() {
      if (me.connection.readyState === WebSocket.OPEN) me.connection.close();
      me.queueReconnect();
    };

    this.connection.onclose = function () {
      me.queueReconnect();
    };
  }

  public queueReconnect() {
    var RECONNECT_TIMEOUT = 3000; // Time to wait before attempting reconnect in MS

    var me = this;
    setTimeout(function() {
      me.connect();
    }, RECONNECT_TIMEOUT);
  }

  private handleMessage(payload) {
    this.broadcast('test', null);
  }

  private broadcast(eventName, msg) {
    var queue = this.listeners[eventName];

    if (!queue) return;

    for (var i = 0; i < queue.length; i++) {
      queue[i].fn.call(queue[i].ctx, msg);
    }
  }
}
