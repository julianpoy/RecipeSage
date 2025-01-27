/*! For license information please see service-worker.js.LICENSE.txt */
(() => {
  "use strict";
  var e = {
      693: () => {
        try {
          self["workbox:core:7.2.0"] && _();
        } catch (e) {}
      },
      555: () => {
        try {
          self["workbox:expiration:7.2.0"] && _();
        } catch (e) {}
      },
      802: () => {
        try {
          self["workbox:precaching:7.2.0"] && _();
        } catch (e) {}
      },
      448: () => {
        try {
          self["workbox:routing:7.2.0"] && _();
        } catch (e) {}
      },
      303: () => {
        try {
          self["workbox:strategies:7.2.0"] && _();
        } catch (e) {}
      },
    },
    t = {};
  function n(r) {
    var s = t[r];
    if (void 0 !== s) return s.exports;
    var i = (t[r] = { exports: {} });
    return e[r](i, i.exports, n), i.exports;
  }
  (n.g = (function () {
    if ("object" == typeof globalThis) return globalThis;
    try {
      return this || new Function("return this")();
    } catch (e) {
      if ("object" == typeof window) return window;
    }
  })()),
    n(693);
  class r extends Error {
    constructor(e, t) {
      super(
        ((e, ...t) => {
          let n = e;
          return t.length > 0 && (n += ` :: ${JSON.stringify(t)}`), n;
        })(e, t),
      ),
        (this.name = e),
        (this.details = t);
    }
  }
  n(448);
  const s = (e) => (e && "object" == typeof e ? e : { handle: e });
  class i {
    constructor(e, t, n = "GET") {
      (this.handler = s(t)), (this.match = e), (this.method = n);
    }
    setCatchHandler(e) {
      this.catchHandler = s(e);
    }
  }
  class o extends i {
    constructor(e, t, n) {
      super(
        ({ url: t }) => {
          const n = e.exec(t.href);
          if (n && (t.origin === location.origin || 0 === n.index))
            return n.slice(1);
        },
        t,
        n,
      );
    }
  }
  class a {
    constructor() {
      (this._routes = new Map()), (this._defaultHandlerMap = new Map());
    }
    get routes() {
      return this._routes;
    }
    addFetchListener() {
      self.addEventListener("fetch", (e) => {
        const { request: t } = e,
          n = this.handleRequest({ request: t, event: e });
        n && e.respondWith(n);
      });
    }
    addCacheListener() {
      self.addEventListener("message", (e) => {
        if (e.data && "CACHE_URLS" === e.data.type) {
          const { payload: t } = e.data,
            n = Promise.all(
              t.urlsToCache.map((t) => {
                "string" == typeof t && (t = [t]);
                const n = new Request(...t);
                return this.handleRequest({ request: n, event: e });
              }),
            );
          e.waitUntil(n),
            e.ports && e.ports[0] && n.then(() => e.ports[0].postMessage(!0));
        }
      });
    }
    handleRequest({ request: e, event: t }) {
      const n = new URL(e.url, location.href);
      if (!n.protocol.startsWith("http")) return;
      const r = n.origin === location.origin,
        { params: s, route: i } = this.findMatchingRoute({
          event: t,
          request: e,
          sameOrigin: r,
          url: n,
        });
      let o = i && i.handler;
      const a = e.method;
      if (
        (!o &&
          this._defaultHandlerMap.has(a) &&
          (o = this._defaultHandlerMap.get(a)),
        !o)
      )
        return;
      let c;
      try {
        c = o.handle({ url: n, request: e, event: t, params: s });
      } catch (e) {
        c = Promise.reject(e);
      }
      const u = i && i.catchHandler;
      return (
        c instanceof Promise &&
          (this._catchHandler || u) &&
          (c = c.catch(async (r) => {
            if (u)
              try {
                return await u.handle({
                  url: n,
                  request: e,
                  event: t,
                  params: s,
                });
              } catch (e) {
                e instanceof Error && (r = e);
              }
            if (this._catchHandler)
              return this._catchHandler.handle({
                url: n,
                request: e,
                event: t,
              });
            throw r;
          })),
        c
      );
    }
    findMatchingRoute({ url: e, sameOrigin: t, request: n, event: r }) {
      const s = this._routes.get(n.method) || [];
      for (const i of s) {
        let s;
        const o = i.match({ url: e, sameOrigin: t, request: n, event: r });
        if (o)
          return (
            (s = o),
            ((Array.isArray(s) && 0 === s.length) ||
              (o.constructor === Object && 0 === Object.keys(o).length) ||
              "boolean" == typeof o) &&
              (s = void 0),
            { route: i, params: s }
          );
      }
      return {};
    }
    setDefaultHandler(e, t = "GET") {
      this._defaultHandlerMap.set(t, s(e));
    }
    setCatchHandler(e) {
      this._catchHandler = s(e);
    }
    registerRoute(e) {
      this._routes.has(e.method) || this._routes.set(e.method, []),
        this._routes.get(e.method).push(e);
    }
    unregisterRoute(e) {
      if (!this._routes.has(e.method))
        throw new r("unregister-route-but-not-found-with-method", {
          method: e.method,
        });
      const t = this._routes.get(e.method).indexOf(e);
      if (!(t > -1)) throw new r("unregister-route-route-not-registered");
      this._routes.get(e.method).splice(t, 1);
    }
  }
  let c;
  function u(e, t, n) {
    let s;
    if ("string" == typeof e) {
      const r = new URL(e, location.href);
      s = new i(({ url: e }) => e.href === r.href, t, n);
    } else if (e instanceof RegExp) s = new o(e, t, n);
    else if ("function" == typeof e) s = new i(e, t, n);
    else {
      if (!(e instanceof i))
        throw new r("unsupported-route-type", {
          moduleName: "workbox-routing",
          funcName: "registerRoute",
          paramName: "capture",
        });
      s = e;
    }
    return (
      (c || ((c = new a()), c.addFetchListener(), c.addCacheListener()),
      c).registerRoute(s),
      s
    );
  }
  const l = {
      googleAnalytics: "googleAnalytics",
      precache: "precache-v2",
      prefix: "workbox",
      runtime: "runtime",
      suffix: "undefined" != typeof registration ? registration.scope : "",
    },
    h = (e) =>
      [l.prefix, e, l.suffix].filter((e) => e && e.length > 0).join("-"),
    d = (e) => e || h(l.precache),
    p = (e) => e || h(l.runtime);
  function f(e, t) {
    const n = t();
    return e.waitUntil(n), n;
  }
  function g(e) {
    if (!e) throw new r("add-to-cache-list-unexpected-type", { entry: e });
    if ("string" == typeof e) {
      const t = new URL(e, location.href);
      return { cacheKey: t.href, url: t.href };
    }
    const { revision: t, url: n } = e;
    if (!n) throw new r("add-to-cache-list-unexpected-type", { entry: e });
    if (!t) {
      const e = new URL(n, location.href);
      return { cacheKey: e.href, url: e.href };
    }
    const s = new URL(n, location.href),
      i = new URL(n, location.href);
    return (
      s.searchParams.set("__WB_REVISION__", t),
      { cacheKey: s.href, url: i.href }
    );
  }
  n(802);
  class m {
    constructor() {
      (this.updatedURLs = []),
        (this.notUpdatedURLs = []),
        (this.handlerWillStart = async ({ request: e, state: t }) => {
          t && (t.originalRequest = e);
        }),
        (this.cachedResponseWillBeUsed = async ({
          event: e,
          state: t,
          cachedResponse: n,
        }) => {
          if (
            "install" === e.type &&
            t &&
            t.originalRequest &&
            t.originalRequest instanceof Request
          ) {
            const e = t.originalRequest.url;
            n ? this.notUpdatedURLs.push(e) : this.updatedURLs.push(e);
          }
          return n;
        });
    }
  }
  class y {
    constructor({ precacheController: e }) {
      (this.cacheKeyWillBeUsed = async ({ request: e, params: t }) => {
        const n =
          (null == t ? void 0 : t.cacheKey) ||
          this._precacheController.getCacheKeyForURL(e.url);
        return n ? new Request(n, { headers: e.headers }) : e;
      }),
        (this._precacheController = e);
    }
  }
  let w;
  function b(e, t) {
    const n = new URL(e);
    for (const e of t) n.searchParams.delete(e);
    return n.href;
  }
  class v {
    constructor() {
      this.promise = new Promise((e, t) => {
        (this.resolve = e), (this.reject = t);
      });
    }
  }
  const S = new Set();
  function I(e) {
    return "string" == typeof e ? new Request(e) : e;
  }
  n(303);
  class E {
    constructor(e, t) {
      (this._cacheKeys = {}),
        Object.assign(this, t),
        (this.event = t.event),
        (this._strategy = e),
        (this._handlerDeferred = new v()),
        (this._extendLifetimePromises = []),
        (this._plugins = [...e.plugins]),
        (this._pluginStateMap = new Map());
      for (const e of this._plugins) this._pluginStateMap.set(e, {});
      this.event.waitUntil(this._handlerDeferred.promise);
    }
    async fetch(e) {
      const { event: t } = this;
      let n = I(e);
      if (
        "navigate" === n.mode &&
        t instanceof FetchEvent &&
        t.preloadResponse
      ) {
        const e = await t.preloadResponse;
        if (e) return e;
      }
      const s = this.hasCallback("fetchDidFail") ? n.clone() : null;
      try {
        for (const e of this.iterateCallbacks("requestWillFetch"))
          n = await e({ request: n.clone(), event: t });
      } catch (e) {
        if (e instanceof Error)
          throw new r("plugin-error-request-will-fetch", {
            thrownErrorMessage: e.message,
          });
      }
      const i = n.clone();
      try {
        let e;
        e = await fetch(
          n,
          "navigate" === n.mode ? void 0 : this._strategy.fetchOptions,
        );
        for (const n of this.iterateCallbacks("fetchDidSucceed"))
          e = await n({ event: t, request: i, response: e });
        return e;
      } catch (e) {
        throw (
          (s &&
            (await this.runCallbacks("fetchDidFail", {
              error: e,
              event: t,
              originalRequest: s.clone(),
              request: i.clone(),
            })),
          e)
        );
      }
    }
    async fetchAndCachePut(e) {
      const t = await this.fetch(e),
        n = t.clone();
      return this.waitUntil(this.cachePut(e, n)), t;
    }
    async cacheMatch(e) {
      const t = I(e);
      let n;
      const { cacheName: r, matchOptions: s } = this._strategy,
        i = await this.getCacheKey(t, "read"),
        o = Object.assign(Object.assign({}, s), { cacheName: r });
      n = await caches.match(i, o);
      for (const e of this.iterateCallbacks("cachedResponseWillBeUsed"))
        n =
          (await e({
            cacheName: r,
            matchOptions: s,
            cachedResponse: n,
            request: i,
            event: this.event,
          })) || void 0;
      return n;
    }
    async cachePut(e, t) {
      const n = I(e);
      var s;
      await ((s = 0), new Promise((e) => setTimeout(e, s)));
      const i = await this.getCacheKey(n, "write");
      if (!t)
        throw new r("cache-put-with-no-response", {
          url:
            ((o = i.url),
            new URL(String(o), location.href).href.replace(
              new RegExp(`^${location.origin}`),
              "",
            )),
        });
      var o;
      const a = await this._ensureResponseSafeToCache(t);
      if (!a) return !1;
      const { cacheName: c, matchOptions: u } = this._strategy,
        l = await self.caches.open(c),
        h = this.hasCallback("cacheDidUpdate"),
        d = h
          ? await (async function (e, t, n, r) {
              const s = b(t.url, n);
              if (t.url === s) return e.match(t, r);
              const i = Object.assign(Object.assign({}, r), {
                  ignoreSearch: !0,
                }),
                o = await e.keys(t, i);
              for (const t of o) if (s === b(t.url, n)) return e.match(t, r);
            })(l, i.clone(), ["__WB_REVISION__"], u)
          : null;
      try {
        await l.put(i, h ? a.clone() : a);
      } catch (e) {
        if (e instanceof Error)
          throw (
            ("QuotaExceededError" === e.name &&
              (await (async function () {
                for (const e of S) await e();
              })()),
            e)
          );
      }
      for (const e of this.iterateCallbacks("cacheDidUpdate"))
        await e({
          cacheName: c,
          oldResponse: d,
          newResponse: a.clone(),
          request: i,
          event: this.event,
        });
      return !0;
    }
    async getCacheKey(e, t) {
      const n = `${e.url} | ${t}`;
      if (!this._cacheKeys[n]) {
        let r = e;
        for (const e of this.iterateCallbacks("cacheKeyWillBeUsed"))
          r = I(
            await e({
              mode: t,
              request: r,
              event: this.event,
              params: this.params,
            }),
          );
        this._cacheKeys[n] = r;
      }
      return this._cacheKeys[n];
    }
    hasCallback(e) {
      for (const t of this._strategy.plugins) if (e in t) return !0;
      return !1;
    }
    async runCallbacks(e, t) {
      for (const n of this.iterateCallbacks(e)) await n(t);
    }
    *iterateCallbacks(e) {
      for (const t of this._strategy.plugins)
        if ("function" == typeof t[e]) {
          const n = this._pluginStateMap.get(t),
            r = (r) => {
              const s = Object.assign(Object.assign({}, r), { state: n });
              return t[e](s);
            };
          yield r;
        }
    }
    waitUntil(e) {
      return this._extendLifetimePromises.push(e), e;
    }
    async doneWaiting() {
      let e;
      for (; (e = this._extendLifetimePromises.shift()); ) await e;
    }
    destroy() {
      this._handlerDeferred.resolve(null);
    }
    async _ensureResponseSafeToCache(e) {
      let t = e,
        n = !1;
      for (const e of this.iterateCallbacks("cacheWillUpdate"))
        if (
          ((t =
            (await e({
              request: this.request,
              response: t,
              event: this.event,
            })) || void 0),
          (n = !0),
          !t)
        )
          break;
      return n || (t && 200 !== t.status && (t = void 0)), t;
    }
  }
  class x {
    constructor(e = {}) {
      (this.cacheName = p(e.cacheName)),
        (this.plugins = e.plugins || []),
        (this.fetchOptions = e.fetchOptions),
        (this.matchOptions = e.matchOptions);
    }
    handle(e) {
      const [t] = this.handleAll(e);
      return t;
    }
    handleAll(e) {
      e instanceof FetchEvent && (e = { event: e, request: e.request });
      const t = e.event,
        n = "string" == typeof e.request ? new Request(e.request) : e.request,
        r = "params" in e ? e.params : void 0,
        s = new E(this, { event: t, request: n, params: r }),
        i = this._getResponse(s, n, t);
      return [i, this._awaitComplete(i, s, n, t)];
    }
    async _getResponse(e, t, n) {
      let s;
      await e.runCallbacks("handlerWillStart", { event: n, request: t });
      try {
        if (((s = await this._handle(t, e)), !s || "error" === s.type))
          throw new r("no-response", { url: t.url });
      } catch (r) {
        if (r instanceof Error)
          for (const i of e.iterateCallbacks("handlerDidError"))
            if (((s = await i({ error: r, event: n, request: t })), s)) break;
        if (!s) throw r;
      }
      for (const r of e.iterateCallbacks("handlerWillRespond"))
        s = await r({ event: n, request: t, response: s });
      return s;
    }
    async _awaitComplete(e, t, n, r) {
      let s, i;
      try {
        s = await e;
      } catch (i) {}
      try {
        await t.runCallbacks("handlerDidRespond", {
          event: r,
          request: n,
          response: s,
        }),
          await t.doneWaiting();
      } catch (e) {
        e instanceof Error && (i = e);
      }
      if (
        (await t.runCallbacks("handlerDidComplete", {
          event: r,
          request: n,
          response: s,
          error: i,
        }),
        t.destroy(),
        i)
      )
        throw i;
    }
  }
  class T extends x {
    constructor(e = {}) {
      (e.cacheName = d(e.cacheName)),
        super(e),
        (this._fallbackToNetwork = !1 !== e.fallbackToNetwork),
        this.plugins.push(T.copyRedirectedCacheableResponsesPlugin);
    }
    async _handle(e, t) {
      return (
        (await t.cacheMatch(e)) ||
        (t.event && "install" === t.event.type
          ? await this._handleInstall(e, t)
          : await this._handleFetch(e, t))
      );
    }
    async _handleFetch(e, t) {
      let n;
      const s = t.params || {};
      if (!this._fallbackToNetwork)
        throw new r("missing-precache-entry", {
          cacheName: this.cacheName,
          url: e.url,
        });
      {
        const r = s.integrity,
          i = e.integrity,
          o = !i || i === r;
        (n = await t.fetch(
          new Request(e, { integrity: "no-cors" !== e.mode ? i || r : void 0 }),
        )),
          r &&
            o &&
            "no-cors" !== e.mode &&
            (this._useDefaultCacheabilityPluginIfNeeded(),
            await t.cachePut(e, n.clone()));
      }
      return n;
    }
    async _handleInstall(e, t) {
      this._useDefaultCacheabilityPluginIfNeeded();
      const n = await t.fetch(e);
      if (!(await t.cachePut(e, n.clone())))
        throw new r("bad-precaching-response", {
          url: e.url,
          status: n.status,
        });
      return n;
    }
    _useDefaultCacheabilityPluginIfNeeded() {
      let e = null,
        t = 0;
      for (const [n, r] of this.plugins.entries())
        r !== T.copyRedirectedCacheableResponsesPlugin &&
          (r === T.defaultPrecacheCacheabilityPlugin && (e = n),
          r.cacheWillUpdate && t++);
      0 === t
        ? this.plugins.push(T.defaultPrecacheCacheabilityPlugin)
        : t > 1 && null !== e && this.plugins.splice(e, 1);
    }
  }
  (T.defaultPrecacheCacheabilityPlugin = {
    cacheWillUpdate: async ({ response: e }) =>
      !e || e.status >= 400 ? null : e,
  }),
    (T.copyRedirectedCacheableResponsesPlugin = {
      cacheWillUpdate: async ({ response: e }) =>
        e.redirected
          ? await (async function (e, t) {
              let n = null;
              if (
                (e.url && (n = new URL(e.url).origin),
                n !== self.location.origin)
              )
                throw new r("cross-origin-copy-response", { origin: n });
              const s = e.clone(),
                i = {
                  headers: new Headers(s.headers),
                  status: s.status,
                  statusText: s.statusText,
                },
                o = t ? t(i) : i,
                a = (function () {
                  if (void 0 === w) {
                    const e = new Response("");
                    if ("body" in e)
                      try {
                        new Response(e.body), (w = !0);
                      } catch (e) {
                        w = !1;
                      }
                    w = !1;
                  }
                  return w;
                })()
                  ? s.body
                  : await s.blob();
              return new Response(a, o);
            })(e)
          : e,
    });
  class C {
    constructor({
      cacheName: e,
      plugins: t = [],
      fallbackToNetwork: n = !0,
    } = {}) {
      (this._urlsToCacheKeys = new Map()),
        (this._urlsToCacheModes = new Map()),
        (this._cacheKeysToIntegrities = new Map()),
        (this._strategy = new T({
          cacheName: d(e),
          plugins: [...t, new y({ precacheController: this })],
          fallbackToNetwork: n,
        })),
        (this.install = this.install.bind(this)),
        (this.activate = this.activate.bind(this));
    }
    get strategy() {
      return this._strategy;
    }
    precache(e) {
      this.addToCacheList(e),
        this._installAndActiveListenersAdded ||
          (self.addEventListener("install", this.install),
          self.addEventListener("activate", this.activate),
          (this._installAndActiveListenersAdded = !0));
    }
    addToCacheList(e) {
      const t = [];
      for (const n of e) {
        "string" == typeof n
          ? t.push(n)
          : n && void 0 === n.revision && t.push(n.url);
        const { cacheKey: e, url: s } = g(n),
          i = "string" != typeof n && n.revision ? "reload" : "default";
        if (this._urlsToCacheKeys.has(s) && this._urlsToCacheKeys.get(s) !== e)
          throw new r("add-to-cache-list-conflicting-entries", {
            firstEntry: this._urlsToCacheKeys.get(s),
            secondEntry: e,
          });
        if ("string" != typeof n && n.integrity) {
          if (
            this._cacheKeysToIntegrities.has(e) &&
            this._cacheKeysToIntegrities.get(e) !== n.integrity
          )
            throw new r("add-to-cache-list-conflicting-integrities", {
              url: s,
            });
          this._cacheKeysToIntegrities.set(e, n.integrity);
        }
        if (
          (this._urlsToCacheKeys.set(s, e),
          this._urlsToCacheModes.set(s, i),
          t.length > 0)
        ) {
          const e = `Workbox is precaching URLs without revision info: ${t.join(", ")}\nThis is generally NOT safe. Learn more at https://bit.ly/wb-precache`;
          console.warn(e);
        }
      }
    }
    install(e) {
      return f(e, async () => {
        const t = new m();
        this.strategy.plugins.push(t);
        for (const [t, n] of this._urlsToCacheKeys) {
          const r = this._cacheKeysToIntegrities.get(n),
            s = this._urlsToCacheModes.get(t),
            i = new Request(t, {
              integrity: r,
              cache: s,
              credentials: "same-origin",
            });
          await Promise.all(
            this.strategy.handleAll({
              params: { cacheKey: n },
              request: i,
              event: e,
            }),
          );
        }
        const { updatedURLs: n, notUpdatedURLs: r } = t;
        return { updatedURLs: n, notUpdatedURLs: r };
      });
    }
    activate(e) {
      return f(e, async () => {
        const e = await self.caches.open(this.strategy.cacheName),
          t = await e.keys(),
          n = new Set(this._urlsToCacheKeys.values()),
          r = [];
        for (const s of t) n.has(s.url) || (await e.delete(s), r.push(s.url));
        return { deletedURLs: r };
      });
    }
    getURLsToCacheKeys() {
      return this._urlsToCacheKeys;
    }
    getCachedURLs() {
      return [...this._urlsToCacheKeys.keys()];
    }
    getCacheKeyForURL(e) {
      const t = new URL(e, location.href);
      return this._urlsToCacheKeys.get(t.href);
    }
    getIntegrityForCacheKey(e) {
      return this._cacheKeysToIntegrities.get(e);
    }
    async matchPrecache(e) {
      const t = e instanceof Request ? e.url : e,
        n = this.getCacheKeyForURL(t);
      if (n) return (await self.caches.open(this.strategy.cacheName)).match(n);
    }
    createHandlerBoundToURL(e) {
      const t = this.getCacheKeyForURL(e);
      if (!t) throw new r("non-precached-url", { url: e });
      return (n) => (
        (n.request = new Request(e)),
        (n.params = Object.assign({ cacheKey: t }, n.params)),
        this.strategy.handle(n)
      );
    }
  }
  let k;
  const O = () => (k || (k = new C()), k);
  class D extends i {
    constructor(e, t) {
      super(({ request: n }) => {
        const r = e.getURLsToCacheKeys();
        for (const s of (function* (
          e,
          {
            ignoreURLParametersMatching: t = [/^utm_/, /^fbclid$/],
            directoryIndex: n = "index.html",
            cleanURLs: r = !0,
            urlManipulation: s,
          } = {},
        ) {
          const i = new URL(e, location.href);
          (i.hash = ""), yield i.href;
          const o = (function (e, t = []) {
            for (const n of [...e.searchParams.keys()])
              t.some((e) => e.test(n)) && e.searchParams.delete(n);
            return e;
          })(i, t);
          if ((yield o.href, n && o.pathname.endsWith("/"))) {
            const e = new URL(o.href);
            (e.pathname += n), yield e.href;
          }
          if (r) {
            const e = new URL(o.href);
            (e.pathname += ".html"), yield e.href;
          }
          if (s) {
            const e = s({ url: i });
            for (const t of e) yield t.href;
          }
        })(n.url, t)) {
          const t = r.get(s);
          if (t)
            return { cacheKey: t, integrity: e.getIntegrityForCacheKey(t) };
        }
      }, e.strategy);
    }
  }
  function A(e) {
    e.then(() => {});
  }
  class R extends x {
    async _handle(e, t) {
      let n,
        s = await t.cacheMatch(e);
      if (s);
      else
        try {
          s = await t.fetchAndCachePut(e);
        } catch (e) {
          e instanceof Error && (n = e);
        }
      if (!s) throw new r("no-response", { url: e.url, error: n });
      return s;
    }
  }
  const L = {
    cacheWillUpdate: async ({ response: e }) =>
      200 === e.status || 0 === e.status ? e : null,
  };
  class P extends x {
    constructor(e = {}) {
      super(e),
        this.plugins.some((e) => "cacheWillUpdate" in e) ||
          this.plugins.unshift(L),
        (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0);
    }
    async _handle(e, t) {
      const n = [],
        s = [];
      let i;
      if (this._networkTimeoutSeconds) {
        const { id: r, promise: o } = this._getTimeoutPromise({
          request: e,
          logs: n,
          handler: t,
        });
        (i = r), s.push(o);
      }
      const o = this._getNetworkPromise({
        timeoutId: i,
        request: e,
        logs: n,
        handler: t,
      });
      s.push(o);
      const a = await t.waitUntil(
        (async () => (await t.waitUntil(Promise.race(s))) || (await o))(),
      );
      if (!a) throw new r("no-response", { url: e.url });
      return a;
    }
    _getTimeoutPromise({ request: e, logs: t, handler: n }) {
      let r;
      return {
        promise: new Promise((t) => {
          r = setTimeout(async () => {
            t(await n.cacheMatch(e));
          }, 1e3 * this._networkTimeoutSeconds);
        }),
        id: r,
      };
    }
    async _getNetworkPromise({
      timeoutId: e,
      request: t,
      logs: n,
      handler: r,
    }) {
      let s, i;
      try {
        i = await r.fetchAndCachePut(t);
      } catch (e) {
        e instanceof Error && (s = e);
      }
      return e && clearTimeout(e), (!s && i) || (i = await r.cacheMatch(t)), i;
    }
  }
  const N = (e, t) => t.some((t) => e instanceof t);
  let M, j;
  const q = new WeakMap(),
    F = new WeakMap(),
    U = new WeakMap(),
    B = new WeakMap(),
    z = new WeakMap();
  let $ = {
    get(e, t, n) {
      if (e instanceof IDBTransaction) {
        if ("done" === t) return F.get(e);
        if ("objectStoreNames" === t) return e.objectStoreNames || U.get(e);
        if ("store" === t)
          return n.objectStoreNames[1]
            ? void 0
            : n.objectStore(n.objectStoreNames[0]);
      }
      return K(e[t]);
    },
    set: (e, t, n) => ((e[t] = n), !0),
    has: (e, t) =>
      (e instanceof IDBTransaction && ("done" === t || "store" === t)) ||
      t in e,
  };
  function V(e) {
    return "function" == typeof e
      ? (t = e) !== IDBDatabase.prototype.transaction ||
        "objectStoreNames" in IDBTransaction.prototype
        ? (
            j ||
            (j = [
              IDBCursor.prototype.advance,
              IDBCursor.prototype.continue,
              IDBCursor.prototype.continuePrimaryKey,
            ])
          ).includes(t)
          ? function (...e) {
              return t.apply(H(this), e), K(q.get(this));
            }
          : function (...e) {
              return K(t.apply(H(this), e));
            }
        : function (e, ...n) {
            const r = t.call(H(this), e, ...n);
            return U.set(r, e.sort ? e.sort() : [e]), K(r);
          }
      : (e instanceof IDBTransaction &&
          (function (e) {
            if (F.has(e)) return;
            const t = new Promise((t, n) => {
              const r = () => {
                  e.removeEventListener("complete", s),
                    e.removeEventListener("error", i),
                    e.removeEventListener("abort", i);
                },
                s = () => {
                  t(), r();
                },
                i = () => {
                  n(e.error || new DOMException("AbortError", "AbortError")),
                    r();
                };
              e.addEventListener("complete", s),
                e.addEventListener("error", i),
                e.addEventListener("abort", i);
            });
            F.set(e, t);
          })(e),
        N(
          e,
          M ||
            (M = [
              IDBDatabase,
              IDBObjectStore,
              IDBIndex,
              IDBCursor,
              IDBTransaction,
            ]),
        )
          ? new Proxy(e, $)
          : e);
    var t;
  }
  function K(e) {
    if (e instanceof IDBRequest)
      return (function (e) {
        const t = new Promise((t, n) => {
          const r = () => {
              e.removeEventListener("success", s),
                e.removeEventListener("error", i);
            },
            s = () => {
              t(K(e.result)), r();
            },
            i = () => {
              n(e.error), r();
            };
          e.addEventListener("success", s), e.addEventListener("error", i);
        });
        return (
          t
            .then((t) => {
              t instanceof IDBCursor && q.set(t, e);
            })
            .catch(() => {}),
          z.set(t, e),
          t
        );
      })(e);
    if (B.has(e)) return B.get(e);
    const t = V(e);
    return t !== e && (B.set(e, t), z.set(t, e)), t;
  }
  const H = (e) => z.get(e);
  function W(
    e,
    t,
    { blocked: n, upgrade: r, blocking: s, terminated: i } = {},
  ) {
    const o = indexedDB.open(e, t),
      a = K(o);
    return (
      r &&
        o.addEventListener("upgradeneeded", (e) => {
          r(K(o.result), e.oldVersion, e.newVersion, K(o.transaction), e);
        }),
      n &&
        o.addEventListener("blocked", (e) => n(e.oldVersion, e.newVersion, e)),
      a
        .then((e) => {
          i && e.addEventListener("close", () => i()),
            s &&
              e.addEventListener("versionchange", (e) =>
                s(e.oldVersion, e.newVersion, e),
              );
        })
        .catch(() => {}),
      a
    );
  }
  function G(e, { blocked: t } = {}) {
    const n = indexedDB.deleteDatabase(e);
    return (
      t && n.addEventListener("blocked", (e) => t(e.oldVersion, e)),
      K(n).then(() => {})
    );
  }
  const J = ["get", "getKey", "getAll", "getAllKeys", "count"],
    Y = ["put", "add", "delete", "clear"],
    Q = new Map();
  function Z(e, t) {
    if (!(e instanceof IDBDatabase) || t in e || "string" != typeof t) return;
    if (Q.get(t)) return Q.get(t);
    const n = t.replace(/FromIndex$/, ""),
      r = t !== n,
      s = Y.includes(n);
    if (
      !(n in (r ? IDBIndex : IDBObjectStore).prototype) ||
      (!s && !J.includes(n))
    )
      return;
    const i = async function (e, ...t) {
      const i = this.transaction(e, s ? "readwrite" : "readonly");
      let o = i.store;
      return (
        r && (o = o.index(t.shift())),
        (await Promise.all([o[n](...t), s && i.done]))[0]
      );
    };
    return Q.set(t, i), i;
  }
  var X;
  (X = $),
    ($ = {
      ...X,
      get: (e, t, n) => Z(e, t) || X.get(e, t, n),
      has: (e, t) => !!Z(e, t) || X.has(e, t),
    }),
    n(555);
  const ee = "cache-entries",
    te = (e) => {
      const t = new URL(e, location.href);
      return (t.hash = ""), t.href;
    };
  class ne {
    constructor(e) {
      (this._db = null), (this._cacheName = e);
    }
    _upgradeDb(e) {
      const t = e.createObjectStore(ee, { keyPath: "id" });
      t.createIndex("cacheName", "cacheName", { unique: !1 }),
        t.createIndex("timestamp", "timestamp", { unique: !1 });
    }
    _upgradeDbAndDeleteOldDbs(e) {
      this._upgradeDb(e), this._cacheName && G(this._cacheName);
    }
    async setTimestamp(e, t) {
      const n = {
          url: (e = te(e)),
          timestamp: t,
          cacheName: this._cacheName,
          id: this._getId(e),
        },
        r = (await this.getDb()).transaction(ee, "readwrite", {
          durability: "relaxed",
        });
      await r.store.put(n), await r.done;
    }
    async getTimestamp(e) {
      const t = await this.getDb(),
        n = await t.get(ee, this._getId(e));
      return null == n ? void 0 : n.timestamp;
    }
    async expireEntries(e, t) {
      const n = await this.getDb();
      let r = await n
        .transaction(ee)
        .store.index("timestamp")
        .openCursor(null, "prev");
      const s = [];
      let i = 0;
      for (; r; ) {
        const n = r.value;
        n.cacheName === this._cacheName &&
          ((e && n.timestamp < e) || (t && i >= t) ? s.push(r.value) : i++),
          (r = await r.continue());
      }
      const o = [];
      for (const e of s) await n.delete(ee, e.id), o.push(e.url);
      return o;
    }
    _getId(e) {
      return this._cacheName + "|" + te(e);
    }
    async getDb() {
      return (
        this._db ||
          (this._db = await W("workbox-expiration", 1, {
            upgrade: this._upgradeDbAndDeleteOldDbs.bind(this),
          })),
        this._db
      );
    }
  }
  class re {
    constructor(e, t = {}) {
      (this._isRunning = !1),
        (this._rerunRequested = !1),
        (this._maxEntries = t.maxEntries),
        (this._maxAgeSeconds = t.maxAgeSeconds),
        (this._matchOptions = t.matchOptions),
        (this._cacheName = e),
        (this._timestampModel = new ne(e));
    }
    async expireEntries() {
      if (this._isRunning) return void (this._rerunRequested = !0);
      this._isRunning = !0;
      const e = this._maxAgeSeconds
          ? Date.now() - 1e3 * this._maxAgeSeconds
          : 0,
        t = await this._timestampModel.expireEntries(e, this._maxEntries),
        n = await self.caches.open(this._cacheName);
      for (const e of t) await n.delete(e, this._matchOptions);
      (this._isRunning = !1),
        this._rerunRequested &&
          ((this._rerunRequested = !1), A(this.expireEntries()));
    }
    async updateTimestamp(e) {
      await this._timestampModel.setTimestamp(e, Date.now());
    }
    async isURLExpired(e) {
      if (this._maxAgeSeconds) {
        const t = await this._timestampModel.getTimestamp(e),
          n = Date.now() - 1e3 * this._maxAgeSeconds;
        return void 0 === t || t < n;
      }
      return !1;
    }
    async delete() {
      (this._rerunRequested = !1),
        await this._timestampModel.expireEntries(1 / 0);
    }
  }
  class se {
    constructor(e = {}) {
      var t;
      (this.cachedResponseWillBeUsed = async ({
        event: e,
        request: t,
        cacheName: n,
        cachedResponse: r,
      }) => {
        if (!r) return null;
        const s = this._isResponseDateFresh(r),
          i = this._getCacheExpiration(n);
        A(i.expireEntries());
        const o = i.updateTimestamp(t.url);
        if (e)
          try {
            e.waitUntil(o);
          } catch (e) {}
        return s ? r : null;
      }),
        (this.cacheDidUpdate = async ({ cacheName: e, request: t }) => {
          const n = this._getCacheExpiration(e);
          await n.updateTimestamp(t.url), await n.expireEntries();
        }),
        (this._config = e),
        (this._maxAgeSeconds = e.maxAgeSeconds),
        (this._cacheExpirations = new Map()),
        e.purgeOnQuotaError &&
          ((t = () => this.deleteCacheAndMetadata()), S.add(t));
    }
    _getCacheExpiration(e) {
      if (e === p()) throw new r("expire-custom-caches-only");
      let t = this._cacheExpirations.get(e);
      return (
        t || ((t = new re(e, this._config)), this._cacheExpirations.set(e, t)),
        t
      );
    }
    _isResponseDateFresh(e) {
      if (!this._maxAgeSeconds) return !0;
      const t = this._getDateHeaderTimestamp(e);
      return null === t || t >= Date.now() - 1e3 * this._maxAgeSeconds;
    }
    _getDateHeaderTimestamp(e) {
      if (!e.headers.has("date")) return null;
      const t = e.headers.get("date"),
        n = new Date(t).getTime();
      return isNaN(n) ? null : n;
    }
    async deleteCacheAndMetadata() {
      for (const [e, t] of this._cacheExpirations)
        await self.caches.delete(e), await t.delete();
      this._cacheExpirations = new Map();
    }
  }
  const ie = Object.prototype.toString;
  function oe(e) {
    return (function (e, t) {
      return ie.call(e) === `[object ${t}]`;
    })(e, "Object");
  }
  function ae(e) {
    return Boolean(e && e.then && "function" == typeof e.then);
  }
  function ce(e) {
    return e && e.Math == Math ? e : void 0;
  }
  const ue =
    ("object" == typeof globalThis && ce(globalThis)) ||
    ("object" == typeof window && ce(window)) ||
    ("object" == typeof self && ce(self)) ||
    ("object" == typeof n.g && ce(n.g)) ||
    (function () {
      return this;
    })() ||
    {};
  function le(e, t, n) {
    const r = n || ue,
      s = (r.__SENTRY__ = r.__SENTRY__ || {});
    return s[e] || (s[e] = t());
  }
  function he() {
    const e = ue,
      t = e.crypto || e.msCrypto;
    let n = () => 16 * Math.random();
    try {
      if (t && t.randomUUID) return t.randomUUID().replace(/-/g, "");
      t &&
        t.getRandomValues &&
        (n = () => {
          const e = new Uint8Array(1);
          return t.getRandomValues(e), e[0];
        });
    } catch (e) {}
    return ([1e7] + 1e3 + 4e3 + 8e3 + 1e11).replace(/[018]/g, (e) =>
      (e ^ ((15 & n()) >> (e / 4))).toString(16),
    );
  }
  function de() {
    return Date.now() / 1e3;
  }
  const pe = (function () {
    const { performance: e } = ue;
    if (!e || !e.now) return de;
    const t = Date.now() - e.now(),
      n = null == e.timeOrigin ? t : e.timeOrigin;
    return () => (n + e.now()) / 1e3;
  })();
  let fe;
  (() => {
    const { performance: e } = ue;
    if (!e || !e.now) return void (fe = "none");
    const t = 36e5,
      n = e.now(),
      r = Date.now(),
      s = e.timeOrigin ? Math.abs(e.timeOrigin + n - r) : t,
      i = s < t,
      o = e.timing && e.timing.navigationStart,
      a = "number" == typeof o ? Math.abs(o + n - r) : t;
    i || a < t
      ? s <= a
        ? ((fe = "timeOrigin"), e.timeOrigin)
        : (fe = "navigationStart")
      : (fe = "dateNow");
  })();
  const ge = "undefined" == typeof __SENTRY_DEBUG__ || __SENTRY_DEBUG__,
    me = ["debug", "info", "warn", "error", "log", "assert", "trace"],
    ye = {};
  function we(e) {
    if (!("console" in ue)) return e();
    const t = ue.console,
      n = {},
      r = Object.keys(ye);
    r.forEach((e) => {
      const r = ye[e];
      (n[e] = t[e]), (t[e] = r);
    });
    try {
      return e();
    } finally {
      r.forEach((e) => {
        t[e] = n[e];
      });
    }
  }
  const be = (function () {
      let e = !1;
      const t = {
        enable: () => {
          e = !0;
        },
        disable: () => {
          e = !1;
        },
        isEnabled: () => e,
      };
      return (
        ge
          ? me.forEach((n) => {
              t[n] = (...t) => {
                e &&
                  we(() => {
                    ue.console[n](`Sentry Logger [${n}]:`, ...t);
                  });
              };
            })
          : me.forEach((e) => {
              t[e] = () => {};
            }),
        t
      );
    })(),
    _e = "production",
    ve = "undefined" == typeof __SENTRY_DEBUG__ || __SENTRY_DEBUG__;
  var Se;
  !(function (e) {
    (e[(e.PENDING = 0)] = "PENDING"),
      (e[(e.RESOLVED = 1)] = "RESOLVED"),
      (e[(e.REJECTED = 2)] = "REJECTED");
  })(Se || (Se = {}));
  class Ie {
    constructor(e) {
      Ie.prototype.__init.call(this),
        Ie.prototype.__init2.call(this),
        Ie.prototype.__init3.call(this),
        Ie.prototype.__init4.call(this),
        (this._state = Se.PENDING),
        (this._handlers = []);
      try {
        e(this._resolve, this._reject);
      } catch (e) {
        this._reject(e);
      }
    }
    then(e, t) {
      return new Ie((n, r) => {
        this._handlers.push([
          !1,
          (t) => {
            if (e)
              try {
                n(e(t));
              } catch (e) {
                r(e);
              }
            else n(t);
          },
          (e) => {
            if (t)
              try {
                n(t(e));
              } catch (e) {
                r(e);
              }
            else r(e);
          },
        ]),
          this._executeHandlers();
      });
    }
    catch(e) {
      return this.then((e) => e, e);
    }
    finally(e) {
      return new Ie((t, n) => {
        let r, s;
        return this.then(
          (t) => {
            (s = !1), (r = t), e && e();
          },
          (t) => {
            (s = !0), (r = t), e && e();
          },
        ).then(() => {
          s ? n(r) : t(r);
        });
      });
    }
    __init() {
      this._resolve = (e) => {
        this._setResult(Se.RESOLVED, e);
      };
    }
    __init2() {
      this._reject = (e) => {
        this._setResult(Se.REJECTED, e);
      };
    }
    __init3() {
      this._setResult = (e, t) => {
        this._state === Se.PENDING &&
          (ae(t)
            ? t.then(this._resolve, this._reject)
            : ((this._state = e), (this._value = t), this._executeHandlers()));
      };
    }
    __init4() {
      this._executeHandlers = () => {
        if (this._state === Se.PENDING) return;
        const e = this._handlers.slice();
        (this._handlers = []),
          e.forEach((e) => {
            e[0] ||
              (this._state === Se.RESOLVED && e[1](this._value),
              this._state === Se.REJECTED && e[2](this._value),
              (e[0] = !0));
          });
      };
    }
  }
  function Ee(e, t, n, r = 0) {
    return new Ie((s, i) => {
      const o = e[r];
      if (null === t || "function" != typeof o) s(t);
      else {
        const a = o({ ...t }, n);
        ve &&
          o.id &&
          null === a &&
          be.log(`Event processor "${o.id}" dropped event`),
          ae(a)
            ? a.then((t) => Ee(e, t, n, r + 1).then(s)).then(null, i)
            : Ee(e, a, n, r + 1)
                .then(s)
                .then(null, i);
      }
    });
  }
  function xe(e) {
    return Te(e, new Map());
  }
  function Te(e, t) {
    if (
      (function (e) {
        if (!oe(e)) return !1;
        try {
          const t = Object.getPrototypeOf(e).constructor.name;
          return !t || "Object" === t;
        } catch (e) {
          return !0;
        }
      })(e)
    ) {
      const n = t.get(e);
      if (void 0 !== n) return n;
      const r = {};
      t.set(e, r);
      for (const n of Object.keys(e)) void 0 !== e[n] && (r[n] = Te(e[n], t));
      return r;
    }
    if (Array.isArray(e)) {
      const n = t.get(e);
      if (void 0 !== n) return n;
      const r = [];
      return (
        t.set(e, r),
        e.forEach((e) => {
          r.push(Te(e, t));
        }),
        r
      );
    }
    return e;
  }
  function Ce(e, t = {}) {
    if (
      (t.user &&
        (!e.ipAddress && t.user.ip_address && (e.ipAddress = t.user.ip_address),
        e.did ||
          t.did ||
          (e.did = t.user.id || t.user.email || t.user.username)),
      (e.timestamp = t.timestamp || pe()),
      t.abnormal_mechanism && (e.abnormal_mechanism = t.abnormal_mechanism),
      t.ignoreDuration && (e.ignoreDuration = t.ignoreDuration),
      t.sid && (e.sid = 32 === t.sid.length ? t.sid : he()),
      void 0 !== t.init && (e.init = t.init),
      !e.did && t.did && (e.did = `${t.did}`),
      "number" == typeof t.started && (e.started = t.started),
      e.ignoreDuration)
    )
      e.duration = void 0;
    else if ("number" == typeof t.duration) e.duration = t.duration;
    else {
      const t = e.timestamp - e.started;
      e.duration = t >= 0 ? t : 0;
    }
    t.release && (e.release = t.release),
      t.environment && (e.environment = t.environment),
      !e.ipAddress && t.ipAddress && (e.ipAddress = t.ipAddress),
      !e.userAgent && t.userAgent && (e.userAgent = t.userAgent),
      "number" == typeof t.errors && (e.errors = t.errors),
      t.status && (e.status = t.status);
  }
  function ke(e) {
    return e.transaction;
  }
  const Oe = 1;
  function De(e) {
    const { spanId: t, traceId: n } = e.spanContext(),
      {
        data: r,
        op: s,
        parent_span_id: i,
        status: o,
        tags: a,
        origin: c,
      } = Ae(e);
    return xe({
      data: r,
      op: s,
      parent_span_id: i,
      span_id: t,
      status: o,
      tags: a,
      trace_id: n,
      origin: c,
    });
  }
  function Ae(e) {
    return (function (e) {
      return "function" == typeof e.getSpanJSON;
    })(e)
      ? e.getSpanJSON()
      : "function" == typeof e.toJSON
        ? e.toJSON()
        : {};
  }
  function Re(e) {
    const t = Ue().getClient();
    if (!t) return {};
    const n = (function (e, t, n) {
        const r = t.getOptions(),
          { publicKey: s } = t.getDsn() || {},
          { segment: i } = (n && n.getUser()) || {},
          o = xe({
            environment: r.environment || _e,
            release: r.release,
            user_segment: i,
            public_key: s,
            trace_id: e,
          });
        return t.emit && t.emit("createDsc", o), o;
      })(Ae(e).trace_id || "", t, Ue().getScope()),
      r = ke(e);
    if (!r) return n;
    const s = r && r._frozenDynamicSamplingContext;
    if (s) return s;
    const { sampleRate: i, source: o } = r.metadata;
    null != i && (n.sample_rate = `${i}`);
    const a = Ae(r);
    return (
      o && "url" !== o && (n.transaction = a.description),
      (n.sampled = String(
        (function (e) {
          const { traceFlags: t } = e.spanContext();
          return Boolean(t & Oe);
        })(r),
      )),
      t.emit && t.emit("createDsc", n),
      n
    );
  }
  class Le {
    constructor() {
      (this._notifyingListeners = !1),
        (this._scopeListeners = []),
        (this._eventProcessors = []),
        (this._breadcrumbs = []),
        (this._attachments = []),
        (this._user = {}),
        (this._tags = {}),
        (this._extra = {}),
        (this._contexts = {}),
        (this._sdkProcessingMetadata = {}),
        (this._propagationContext = Pe());
    }
    static clone(e) {
      return e ? e.clone() : new Le();
    }
    clone() {
      const e = new Le();
      return (
        (e._breadcrumbs = [...this._breadcrumbs]),
        (e._tags = { ...this._tags }),
        (e._extra = { ...this._extra }),
        (e._contexts = { ...this._contexts }),
        (e._user = this._user),
        (e._level = this._level),
        (e._span = this._span),
        (e._session = this._session),
        (e._transactionName = this._transactionName),
        (e._fingerprint = this._fingerprint),
        (e._eventProcessors = [...this._eventProcessors]),
        (e._requestSession = this._requestSession),
        (e._attachments = [...this._attachments]),
        (e._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }),
        (e._propagationContext = { ...this._propagationContext }),
        (e._client = this._client),
        e
      );
    }
    setClient(e) {
      this._client = e;
    }
    getClient() {
      return this._client;
    }
    addScopeListener(e) {
      this._scopeListeners.push(e);
    }
    addEventProcessor(e) {
      return this._eventProcessors.push(e), this;
    }
    setUser(e) {
      return (
        (this._user = e || {
          email: void 0,
          id: void 0,
          ip_address: void 0,
          segment: void 0,
          username: void 0,
        }),
        this._session && Ce(this._session, { user: e }),
        this._notifyScopeListeners(),
        this
      );
    }
    getUser() {
      return this._user;
    }
    getRequestSession() {
      return this._requestSession;
    }
    setRequestSession(e) {
      return (this._requestSession = e), this;
    }
    setTags(e) {
      return (
        (this._tags = { ...this._tags, ...e }),
        this._notifyScopeListeners(),
        this
      );
    }
    setTag(e, t) {
      return (
        (this._tags = { ...this._tags, [e]: t }),
        this._notifyScopeListeners(),
        this
      );
    }
    setExtras(e) {
      return (
        (this._extra = { ...this._extra, ...e }),
        this._notifyScopeListeners(),
        this
      );
    }
    setExtra(e, t) {
      return (
        (this._extra = { ...this._extra, [e]: t }),
        this._notifyScopeListeners(),
        this
      );
    }
    setFingerprint(e) {
      return (this._fingerprint = e), this._notifyScopeListeners(), this;
    }
    setLevel(e) {
      return (this._level = e), this._notifyScopeListeners(), this;
    }
    setTransactionName(e) {
      return (this._transactionName = e), this._notifyScopeListeners(), this;
    }
    setContext(e, t) {
      return (
        null === t ? delete this._contexts[e] : (this._contexts[e] = t),
        this._notifyScopeListeners(),
        this
      );
    }
    setSpan(e) {
      return (this._span = e), this._notifyScopeListeners(), this;
    }
    getSpan() {
      return this._span;
    }
    getTransaction() {
      const e = this._span;
      return e && e.transaction;
    }
    setSession(e) {
      return (
        e ? (this._session = e) : delete this._session,
        this._notifyScopeListeners(),
        this
      );
    }
    getSession() {
      return this._session;
    }
    update(e) {
      if (!e) return this;
      const t = "function" == typeof e ? e(this) : e;
      if (t instanceof Le) {
        const e = t.getScopeData();
        (this._tags = { ...this._tags, ...e.tags }),
          (this._extra = { ...this._extra, ...e.extra }),
          (this._contexts = { ...this._contexts, ...e.contexts }),
          e.user && Object.keys(e.user).length && (this._user = e.user),
          e.level && (this._level = e.level),
          e.fingerprint.length && (this._fingerprint = e.fingerprint),
          t.getRequestSession() &&
            (this._requestSession = t.getRequestSession()),
          e.propagationContext &&
            (this._propagationContext = e.propagationContext);
      } else if (oe(t)) {
        const t = e;
        (this._tags = { ...this._tags, ...t.tags }),
          (this._extra = { ...this._extra, ...t.extra }),
          (this._contexts = { ...this._contexts, ...t.contexts }),
          t.user && (this._user = t.user),
          t.level && (this._level = t.level),
          t.fingerprint && (this._fingerprint = t.fingerprint),
          t.requestSession && (this._requestSession = t.requestSession),
          t.propagationContext &&
            (this._propagationContext = t.propagationContext);
      }
      return this;
    }
    clear() {
      return (
        (this._breadcrumbs = []),
        (this._tags = {}),
        (this._extra = {}),
        (this._user = {}),
        (this._contexts = {}),
        (this._level = void 0),
        (this._transactionName = void 0),
        (this._fingerprint = void 0),
        (this._requestSession = void 0),
        (this._span = void 0),
        (this._session = void 0),
        this._notifyScopeListeners(),
        (this._attachments = []),
        (this._propagationContext = Pe()),
        this
      );
    }
    addBreadcrumb(e, t) {
      const n = "number" == typeof t ? t : 100;
      if (n <= 0) return this;
      const r = { timestamp: de(), ...e },
        s = this._breadcrumbs;
      return (
        s.push(r),
        (this._breadcrumbs = s.length > n ? s.slice(-n) : s),
        this._notifyScopeListeners(),
        this
      );
    }
    getLastBreadcrumb() {
      return this._breadcrumbs[this._breadcrumbs.length - 1];
    }
    clearBreadcrumbs() {
      return (this._breadcrumbs = []), this._notifyScopeListeners(), this;
    }
    addAttachment(e) {
      return this._attachments.push(e), this;
    }
    getAttachments() {
      return this.getScopeData().attachments;
    }
    clearAttachments() {
      return (this._attachments = []), this;
    }
    getScopeData() {
      const {
        _breadcrumbs: e,
        _attachments: t,
        _contexts: n,
        _tags: r,
        _extra: s,
        _user: i,
        _level: o,
        _fingerprint: a,
        _eventProcessors: c,
        _propagationContext: u,
        _sdkProcessingMetadata: l,
        _transactionName: h,
        _span: d,
      } = this;
      return {
        breadcrumbs: e,
        attachments: t,
        contexts: n,
        tags: r,
        extra: s,
        user: i,
        level: o,
        fingerprint: a || [],
        eventProcessors: c,
        propagationContext: u,
        sdkProcessingMetadata: l,
        transactionName: h,
        span: d,
      };
    }
    applyToEvent(e, t = {}, n = []) {
      return (
        (function (e, t) {
          const {
            fingerprint: n,
            span: r,
            breadcrumbs: s,
            sdkProcessingMetadata: i,
          } = t;
          !(function (e, t) {
            const {
                extra: n,
                tags: r,
                user: s,
                contexts: i,
                level: o,
                transactionName: a,
              } = t,
              c = xe(n);
            c && Object.keys(c).length && (e.extra = { ...c, ...e.extra });
            const u = xe(r);
            u && Object.keys(u).length && (e.tags = { ...u, ...e.tags });
            const l = xe(s);
            l && Object.keys(l).length && (e.user = { ...l, ...e.user });
            const h = xe(i);
            h &&
              Object.keys(h).length &&
              (e.contexts = { ...h, ...e.contexts }),
              o && (e.level = o),
              a && (e.transaction = a);
          })(e, t),
            r &&
              (function (e, t) {
                e.contexts = { trace: De(t), ...e.contexts };
                const n = ke(t);
                if (n) {
                  e.sdkProcessingMetadata = {
                    dynamicSamplingContext: Re(t),
                    ...e.sdkProcessingMetadata,
                  };
                  const r = Ae(n).description;
                  r && (e.tags = { transaction: r, ...e.tags });
                }
              })(e, r),
            (function (e, t) {
              var n;
              (e.fingerprint = e.fingerprint
                ? ((n = e.fingerprint), Array.isArray(n) ? n : [n])
                : []),
                t && (e.fingerprint = e.fingerprint.concat(t)),
                e.fingerprint && !e.fingerprint.length && delete e.fingerprint;
            })(e, n),
            (function (e, t) {
              const n = [...(e.breadcrumbs || []), ...t];
              e.breadcrumbs = n.length ? n : void 0;
            })(e, s),
            (function (e, t) {
              e.sdkProcessingMetadata = { ...e.sdkProcessingMetadata, ...t };
            })(e, i);
        })(e, this.getScopeData()),
        Ee(
          [
            ...n,
            ...le("globalEventProcessors", () => []),
            ...this._eventProcessors,
          ],
          e,
          t,
        )
      );
    }
    setSDKProcessingMetadata(e) {
      return (
        (this._sdkProcessingMetadata = {
          ...this._sdkProcessingMetadata,
          ...e,
        }),
        this
      );
    }
    setPropagationContext(e) {
      return (this._propagationContext = e), this;
    }
    getPropagationContext() {
      return this._propagationContext;
    }
    captureException(e, t) {
      const n = t && t.event_id ? t.event_id : he();
      if (!this._client)
        return (
          be.warn(
            "No client configured on scope - will not capture exception!",
          ),
          n
        );
      const r = new Error("Sentry syntheticException");
      return (
        this._client.captureException(
          e,
          { originalException: e, syntheticException: r, ...t, event_id: n },
          this,
        ),
        n
      );
    }
    captureMessage(e, t, n) {
      const r = n && n.event_id ? n.event_id : he();
      if (!this._client)
        return (
          be.warn("No client configured on scope - will not capture message!"),
          r
        );
      const s = new Error(e);
      return (
        this._client.captureMessage(
          e,
          t,
          { originalException: e, syntheticException: s, ...n, event_id: r },
          this,
        ),
        r
      );
    }
    captureEvent(e, t) {
      const n = t && t.event_id ? t.event_id : he();
      return this._client
        ? (this._client.captureEvent(e, { ...t, event_id: n }, this), n)
        : (be.warn("No client configured on scope - will not capture event!"),
          n);
    }
    _notifyScopeListeners() {
      this._notifyingListeners ||
        ((this._notifyingListeners = !0),
        this._scopeListeners.forEach((e) => {
          e(this);
        }),
        (this._notifyingListeners = !1));
    }
  }
  function Pe() {
    return { traceId: he(), spanId: he().substring(16) };
  }
  const Ne = parseFloat("7.119.2"),
    Me = 100;
  class je {
    constructor(e, t, n, r = Ne) {
      let s, i;
      (this._version = r),
        t ? (s = t) : ((s = new Le()), s.setClient(e)),
        n ? (i = n) : ((i = new Le()), i.setClient(e)),
        (this._stack = [{ scope: s }]),
        e && this.bindClient(e),
        (this._isolationScope = i);
    }
    isOlderThan(e) {
      return this._version < e;
    }
    bindClient(e) {
      const t = this.getStackTop();
      (t.client = e),
        t.scope.setClient(e),
        e && e.setupIntegrations && e.setupIntegrations();
    }
    pushScope() {
      const e = this.getScope().clone();
      return this.getStack().push({ client: this.getClient(), scope: e }), e;
    }
    popScope() {
      return !(this.getStack().length <= 1 || !this.getStack().pop());
    }
    withScope(e) {
      const t = this.pushScope();
      let n;
      try {
        n = e(t);
      } catch (e) {
        throw (this.popScope(), e);
      }
      return ae(n)
        ? n.then(
            (e) => (this.popScope(), e),
            (e) => {
              throw (this.popScope(), e);
            },
          )
        : (this.popScope(), n);
    }
    getClient() {
      return this.getStackTop().client;
    }
    getScope() {
      return this.getStackTop().scope;
    }
    getIsolationScope() {
      return this._isolationScope;
    }
    getStack() {
      return this._stack;
    }
    getStackTop() {
      return this._stack[this._stack.length - 1];
    }
    captureException(e, t) {
      const n = (this._lastEventId = t && t.event_id ? t.event_id : he()),
        r = new Error("Sentry syntheticException");
      return (
        this.getScope().captureException(e, {
          originalException: e,
          syntheticException: r,
          ...t,
          event_id: n,
        }),
        n
      );
    }
    captureMessage(e, t, n) {
      const r = (this._lastEventId = n && n.event_id ? n.event_id : he()),
        s = new Error(e);
      return (
        this.getScope().captureMessage(e, t, {
          originalException: e,
          syntheticException: s,
          ...n,
          event_id: r,
        }),
        r
      );
    }
    captureEvent(e, t) {
      const n = t && t.event_id ? t.event_id : he();
      return (
        e.type || (this._lastEventId = n),
        this.getScope().captureEvent(e, { ...t, event_id: n }),
        n
      );
    }
    lastEventId() {
      return this._lastEventId;
    }
    addBreadcrumb(e, t) {
      const { scope: n, client: r } = this.getStackTop();
      if (!r) return;
      const { beforeBreadcrumb: s = null, maxBreadcrumbs: i = Me } =
        (r.getOptions && r.getOptions()) || {};
      if (i <= 0) return;
      const o = { timestamp: de(), ...e },
        a = s ? we(() => s(o, t)) : o;
      null !== a &&
        (r.emit && r.emit("beforeAddBreadcrumb", a, t), n.addBreadcrumb(a, i));
    }
    setUser(e) {
      this.getScope().setUser(e), this.getIsolationScope().setUser(e);
    }
    setTags(e) {
      this.getScope().setTags(e), this.getIsolationScope().setTags(e);
    }
    setExtras(e) {
      this.getScope().setExtras(e), this.getIsolationScope().setExtras(e);
    }
    setTag(e, t) {
      this.getScope().setTag(e, t), this.getIsolationScope().setTag(e, t);
    }
    setExtra(e, t) {
      this.getScope().setExtra(e, t), this.getIsolationScope().setExtra(e, t);
    }
    setContext(e, t) {
      this.getScope().setContext(e, t),
        this.getIsolationScope().setContext(e, t);
    }
    configureScope(e) {
      const { scope: t, client: n } = this.getStackTop();
      n && e(t);
    }
    run(e) {
      const t = Fe(this);
      try {
        e(this);
      } finally {
        Fe(t);
      }
    }
    getIntegration(e) {
      const t = this.getClient();
      if (!t) return null;
      try {
        return t.getIntegration(e);
      } catch (t) {
        return (
          ve &&
            be.warn(`Cannot retrieve integration ${e.id} from the current Hub`),
          null
        );
      }
    }
    startTransaction(e, t) {
      const n = this._callExtensionMethod("startTransaction", e, t);
      return (
        ve &&
          !n &&
          (this.getClient()
            ? be.warn(
                "Tracing extension 'startTransaction' has not been added. Call 'addTracingExtensions' before calling 'init':\nSentry.addTracingExtensions();\nSentry.init({...});\n",
              )
            : be.warn(
                "Tracing extension 'startTransaction' is missing. You should 'init' the SDK before calling 'startTransaction'",
              )),
        n
      );
    }
    traceHeaders() {
      return this._callExtensionMethod("traceHeaders");
    }
    captureSession(e = !1) {
      if (e) return this.endSession();
      this._sendSessionUpdate();
    }
    endSession() {
      const e = this.getStackTop().scope,
        t = e.getSession();
      t &&
        (function (e) {
          let t = {};
          "ok" === e.status && (t = { status: "exited" }), Ce(e, t);
        })(t),
        this._sendSessionUpdate(),
        e.setSession();
    }
    startSession(e) {
      const { scope: t, client: n } = this.getStackTop(),
        { release: r, environment: s = _e } = (n && n.getOptions()) || {},
        { userAgent: i } = ue.navigator || {},
        o = (function (e) {
          const t = pe(),
            n = {
              sid: he(),
              init: !0,
              timestamp: t,
              started: t,
              duration: 0,
              status: "ok",
              errors: 0,
              ignoreDuration: !1,
              toJSON: () =>
                (function (e) {
                  return xe({
                    sid: `${e.sid}`,
                    init: e.init,
                    started: new Date(1e3 * e.started).toISOString(),
                    timestamp: new Date(1e3 * e.timestamp).toISOString(),
                    status: e.status,
                    errors: e.errors,
                    did:
                      "number" == typeof e.did || "string" == typeof e.did
                        ? `${e.did}`
                        : void 0,
                    duration: e.duration,
                    abnormal_mechanism: e.abnormal_mechanism,
                    attrs: {
                      release: e.release,
                      environment: e.environment,
                      ip_address: e.ipAddress,
                      user_agent: e.userAgent,
                    },
                  });
                })(n),
            };
          return e && Ce(n, e), n;
        })({
          release: r,
          environment: s,
          user: t.getUser(),
          ...(i && { userAgent: i }),
          ...e,
        }),
        a = t.getSession && t.getSession();
      return (
        a && "ok" === a.status && Ce(a, { status: "exited" }),
        this.endSession(),
        t.setSession(o),
        o
      );
    }
    shouldSendDefaultPii() {
      const e = this.getClient(),
        t = e && e.getOptions();
      return Boolean(t && t.sendDefaultPii);
    }
    _sendSessionUpdate() {
      const { scope: e, client: t } = this.getStackTop(),
        n = e.getSession();
      n && t && t.captureSession && t.captureSession(n);
    }
    _callExtensionMethod(e, ...t) {
      const n = qe().__SENTRY__;
      if (n && n.extensions && "function" == typeof n.extensions[e])
        return n.extensions[e].apply(this, t);
      ve && be.warn(`Extension method ${e} couldn't be found, doing nothing.`);
    }
  }
  function qe() {
    return (
      (ue.__SENTRY__ = ue.__SENTRY__ || { extensions: {}, hub: void 0 }), ue
    );
  }
  function Fe(e) {
    const t = qe(),
      n = Be(t);
    return ze(t, e), n;
  }
  function Ue() {
    const e = qe();
    if (e.__SENTRY__ && e.__SENTRY__.acs) {
      const t = e.__SENTRY__.acs.getCurrentHub();
      if (t) return t;
    }
    return (function (e = qe()) {
      return (
        (t = e),
        (!!(t && t.__SENTRY__ && t.__SENTRY__.hub) && !Be(e).isOlderThan(Ne)) ||
          ze(e, new je()),
        Be(e)
      );
      var t;
    })(e);
  }
  function Be(e) {
    return le("hub", () => new je(), e);
  }
  function ze(e, t) {
    return !!e && (((e.__SENTRY__ = e.__SENTRY__ || {}).hub = t), !0);
  }
  new WeakMap();
  const $e = [
    "user",
    "level",
    "extra",
    "contexts",
    "tags",
    "fingerprint",
    "requestSession",
    "propagationContext",
  ];
  var Ve, Ke;
  !(function (e) {
    (e.Recipes = "recipes"),
      (e.Labels = "labels"),
      (e.LabelGroups = "labelGroups"),
      (e.ShoppingLists = "shoppingLists"),
      (e.MealPlans = "mealPlans"),
      (e.KV = "kvStore");
  })(Ve || (Ve = {})),
    (function (e) {
      (e.Session = "session"),
        (e.RecipeSearchIndex = "recipeSearchIndex"),
        (e.LastSessionUserId = "lastSessionUserId");
    })(Ke || (Ke = {}));
  const He = () =>
    W("localDb", 1, {
      upgrade: (e, t, n) => {
        console.log(`Local DB upgrading from ${t} to ${n}`);
        try {
          if (0 === t) {
            e.createObjectStore(Ve.Recipes, { keyPath: "id" }).createIndex(
              "userId",
              "userId",
              { unique: !1 },
            );
            const t = e.createObjectStore(Ve.Labels, { keyPath: "id" });
            return (
              t.createIndex("userId", "userId", { unique: !1 }),
              t.createIndex("title", "title", { unique: !1 }),
              t.createIndex("labelGroupId", "labelGroupId", { unique: !1 }),
              e
                .createObjectStore(Ve.LabelGroups, { keyPath: "id" })
                .createIndex("userId", "userId", { unique: !1 }),
              e
                .createObjectStore(Ve.ShoppingLists, { keyPath: "id" })
                .createIndex("userId", "userId", { unique: !1 }),
              e
                .createObjectStore(Ve.MealPlans, { keyPath: "id" })
                .createIndex("userId", "userId", { unique: !1 }),
              void e.createObjectStore(Ve.KV, { keyPath: "key" })
            );
          }
        } catch (e) {
          throw (
            (console.error(e),
            (r = e),
            (s = { extra: { info: "Localdb failed to upgrade!" } }),
            Ue().captureException(
              r,
              (function (e) {
                if (e)
                  return (function (e) {
                    return e instanceof Le || "function" == typeof e;
                  })(e) ||
                    (function (e) {
                      return Object.keys(e).some((e) => $e.includes(e));
                    })(e)
                    ? { captureContext: e }
                    : e;
              })(s),
            ),
            e)
          );
        }
        var r, s;
        console.log(`Local DB upgraded from ${t} to ${n}`);
      },
    });
  let We;
  async function Ge() {
    return We || (We = He()), await We;
  }
  function Je(e, t, n, r) {
    return new (n || (n = Promise))(function (s, i) {
      function o(e) {
        try {
          c(r.next(e));
        } catch (e) {
          i(e);
        }
      }
      function a(e) {
        try {
          c(r.throw(e));
        } catch (e) {
          i(e);
        }
      }
      function c(e) {
        var t;
        e.done
          ? s(e.value)
          : ((t = e.value),
            t instanceof n
              ? t
              : new n(function (e) {
                  e(t);
                })).then(o, a);
      }
      c((r = r.apply(e, t || [])).next());
    });
  }
  "function" == typeof SuppressedError && SuppressedError;
  const Ye = "KEYS",
    Qe = "VALUES",
    Ze = "";
  class Xe {
    constructor(e, t) {
      const n = e._tree,
        r = Array.from(n.keys());
      (this.set = e),
        (this._type = t),
        (this._path = r.length > 0 ? [{ node: n, keys: r }] : []);
    }
    next() {
      const e = this.dive();
      return this.backtrack(), e;
    }
    dive() {
      if (0 === this._path.length) return { done: !0, value: void 0 };
      const { node: e, keys: t } = et(this._path);
      if (et(t) === Ze) return { done: !1, value: this.result() };
      const n = e.get(et(t));
      return (
        this._path.push({ node: n, keys: Array.from(n.keys()) }), this.dive()
      );
    }
    backtrack() {
      if (0 === this._path.length) return;
      const e = et(this._path).keys;
      e.pop(), e.length > 0 || (this._path.pop(), this.backtrack());
    }
    key() {
      return (
        this.set._prefix +
        this._path
          .map(({ keys: e }) => et(e))
          .filter((e) => e !== Ze)
          .join("")
      );
    }
    value() {
      return et(this._path).node.get(Ze);
    }
    result() {
      switch (this._type) {
        case Qe:
          return this.value();
        case Ye:
          return this.key();
        default:
          return [this.key(), this.value()];
      }
    }
    [Symbol.iterator]() {
      return this;
    }
  }
  const et = (e) => e[e.length - 1],
    tt = (e, t, n, r, s, i, o, a) => {
      const c = i * o;
      e: for (const u of e.keys())
        if (u === Ze) {
          const t = s[c - 1];
          t <= n && r.set(a, [e.get(u), t]);
        } else {
          let c = i;
          for (let e = 0; e < u.length; ++e, ++c) {
            const r = u[e],
              i = o * c,
              a = i - o;
            let l = s[i];
            const h = Math.max(0, c - n - 1),
              d = Math.min(o - 1, c + n);
            for (let e = h; e < d; ++e) {
              const n = r !== t[e],
                o = s[a + e] + +n,
                c = s[a + e + 1] + 1,
                u = s[i + e] + 1,
                h = (s[i + e + 1] = Math.min(o, c, u));
              h < l && (l = h);
            }
            if (l > n) continue e;
          }
          tt(e.get(u), t, n, r, s, c, o, a + u);
        }
    };
  class nt {
    constructor(e = new Map(), t = "") {
      (this._size = void 0), (this._tree = e), (this._prefix = t);
    }
    atPrefix(e) {
      if (!e.startsWith(this._prefix)) throw new Error("Mismatched prefix");
      const [t, n] = rt(this._tree, e.slice(this._prefix.length));
      if (void 0 === t) {
        const [t, r] = ut(n);
        for (const n of t.keys())
          if (n !== Ze && n.startsWith(r)) {
            const s = new Map();
            return s.set(n.slice(r.length), t.get(n)), new nt(s, e);
          }
      }
      return new nt(t, e);
    }
    clear() {
      (this._size = void 0), this._tree.clear();
    }
    delete(e) {
      return (this._size = void 0), ot(this._tree, e);
    }
    entries() {
      return new Xe(this, "ENTRIES");
    }
    forEach(e) {
      for (const [t, n] of this) e(t, n, this);
    }
    fuzzyGet(e, t) {
      return ((e, t, n) => {
        const r = new Map();
        if (void 0 === t) return r;
        const s = t.length + 1,
          i = s + n,
          o = new Uint8Array(i * s).fill(n + 1);
        for (let e = 0; e < s; ++e) o[e] = e;
        for (let e = 1; e < i; ++e) o[e * s] = e;
        return tt(e, t, n, r, o, 1, s, ""), r;
      })(this._tree, e, t);
    }
    get(e) {
      const t = st(this._tree, e);
      return void 0 !== t ? t.get(Ze) : void 0;
    }
    has(e) {
      const t = st(this._tree, e);
      return void 0 !== t && t.has(Ze);
    }
    keys() {
      return new Xe(this, Ye);
    }
    set(e, t) {
      if ("string" != typeof e) throw new Error("key must be a string");
      return (this._size = void 0), it(this._tree, e).set(Ze, t), this;
    }
    get size() {
      if (this._size) return this._size;
      this._size = 0;
      const e = this.entries();
      for (; !e.next().done; ) this._size += 1;
      return this._size;
    }
    update(e, t) {
      if ("string" != typeof e) throw new Error("key must be a string");
      this._size = void 0;
      const n = it(this._tree, e);
      return n.set(Ze, t(n.get(Ze))), this;
    }
    fetch(e, t) {
      if ("string" != typeof e) throw new Error("key must be a string");
      this._size = void 0;
      const n = it(this._tree, e);
      let r = n.get(Ze);
      return void 0 === r && n.set(Ze, (r = t())), r;
    }
    values() {
      return new Xe(this, Qe);
    }
    [Symbol.iterator]() {
      return this.entries();
    }
    static from(e) {
      const t = new nt();
      for (const [n, r] of e) t.set(n, r);
      return t;
    }
    static fromObject(e) {
      return nt.from(Object.entries(e));
    }
  }
  const rt = (e, t, n = []) => {
      if (0 === t.length || null == e) return [e, n];
      for (const r of e.keys())
        if (r !== Ze && t.startsWith(r))
          return n.push([e, r]), rt(e.get(r), t.slice(r.length), n);
      return n.push([e, t]), rt(void 0, "", n);
    },
    st = (e, t) => {
      if (0 === t.length || null == e) return e;
      for (const n of e.keys())
        if (n !== Ze && t.startsWith(n)) return st(e.get(n), t.slice(n.length));
    },
    it = (e, t) => {
      const n = t.length;
      e: for (let r = 0; e && r < n; ) {
        for (const s of e.keys())
          if (s !== Ze && t[r] === s[0]) {
            const i = Math.min(n - r, s.length);
            let o = 1;
            for (; o < i && t[r + o] === s[o]; ) ++o;
            const a = e.get(s);
            if (o === s.length) e = a;
            else {
              const n = new Map();
              n.set(s.slice(o), a),
                e.set(t.slice(r, r + o), n),
                e.delete(s),
                (e = n);
            }
            r += o;
            continue e;
          }
        const s = new Map();
        return e.set(t.slice(r), s), s;
      }
      return e;
    },
    ot = (e, t) => {
      const [n, r] = rt(e, t);
      if (void 0 !== n)
        if ((n.delete(Ze), 0 === n.size)) at(r);
        else if (1 === n.size) {
          const [e, t] = n.entries().next().value;
          ct(r, e, t);
        }
    },
    at = (e) => {
      if (0 === e.length) return;
      const [t, n] = ut(e);
      if ((t.delete(n), 0 === t.size)) at(e.slice(0, -1));
      else if (1 === t.size) {
        const [n, r] = t.entries().next().value;
        n !== Ze && ct(e.slice(0, -1), n, r);
      }
    },
    ct = (e, t, n) => {
      if (0 === e.length) return;
      const [r, s] = ut(e);
      r.set(s + t, n), r.delete(s);
    },
    ut = (e) => e[e.length - 1],
    lt = "or",
    ht = "and",
    dt = "and_not";
  class pt {
    constructor(e) {
      if (null == (null == e ? void 0 : e.fields))
        throw new Error('MiniSearch: option "fields" must be provided');
      const t = null == e.autoVacuum || !0 === e.autoVacuum ? It : e.autoVacuum;
      (this._options = Object.assign(Object.assign(Object.assign({}, wt), e), {
        autoVacuum: t,
        searchOptions: Object.assign(
          Object.assign({}, bt),
          e.searchOptions || {},
        ),
        autoSuggestOptions: Object.assign(
          Object.assign({}, _t),
          e.autoSuggestOptions || {},
        ),
      })),
        (this._index = new nt()),
        (this._documentCount = 0),
        (this._documentIds = new Map()),
        (this._idToShortId = new Map()),
        (this._fieldIds = {}),
        (this._fieldLength = new Map()),
        (this._avgFieldLength = []),
        (this._nextId = 0),
        (this._storedFields = new Map()),
        (this._dirtCount = 0),
        (this._currentVacuum = null),
        (this._enqueuedVacuum = null),
        (this._enqueuedVacuumConditions = St),
        this.addFields(this._options.fields);
    }
    add(e) {
      const {
          extractField: t,
          tokenize: n,
          processTerm: r,
          fields: s,
          idField: i,
        } = this._options,
        o = t(e, i);
      if (null == o)
        throw new Error(`MiniSearch: document does not have ID field "${i}"`);
      if (this._idToShortId.has(o))
        throw new Error(`MiniSearch: duplicate ID ${o}`);
      const a = this.addDocumentId(o);
      this.saveStoredFields(a, e);
      for (const i of s) {
        const s = t(e, i);
        if (null == s) continue;
        const o = n(s.toString(), i),
          c = this._fieldIds[i],
          u = new Set(o).size;
        this.addFieldLength(a, c, this._documentCount - 1, u);
        for (const e of o) {
          const t = r(e, i);
          if (Array.isArray(t)) for (const e of t) this.addTerm(c, a, e);
          else t && this.addTerm(c, a, t);
        }
      }
    }
    addAll(e) {
      for (const t of e) this.add(t);
    }
    addAllAsync(e, t = {}) {
      const { chunkSize: n = 10 } = t,
        r = { chunk: [], promise: Promise.resolve() },
        { chunk: s, promise: i } = e.reduce(
          ({ chunk: e, promise: t }, r, s) => (
            e.push(r),
            (s + 1) % n == 0
              ? {
                  chunk: [],
                  promise: t
                    .then(() => new Promise((e) => setTimeout(e, 0)))
                    .then(() => this.addAll(e)),
                }
              : { chunk: e, promise: t }
          ),
          r,
        );
      return i.then(() => this.addAll(s));
    }
    remove(e) {
      const {
          tokenize: t,
          processTerm: n,
          extractField: r,
          fields: s,
          idField: i,
        } = this._options,
        o = r(e, i);
      if (null == o)
        throw new Error(`MiniSearch: document does not have ID field "${i}"`);
      const a = this._idToShortId.get(o);
      if (null == a)
        throw new Error(
          `MiniSearch: cannot remove document with ID ${o}: it is not in the index`,
        );
      for (const i of s) {
        const s = r(e, i);
        if (null == s) continue;
        const o = t(s.toString(), i),
          c = this._fieldIds[i],
          u = new Set(o).size;
        this.removeFieldLength(a, c, this._documentCount, u);
        for (const e of o) {
          const t = n(e, i);
          if (Array.isArray(t)) for (const e of t) this.removeTerm(c, a, e);
          else t && this.removeTerm(c, a, t);
        }
      }
      this._storedFields.delete(a),
        this._documentIds.delete(a),
        this._idToShortId.delete(o),
        this._fieldLength.delete(a),
        (this._documentCount -= 1);
    }
    removeAll(e) {
      if (e) for (const t of e) this.remove(t);
      else {
        if (arguments.length > 0)
          throw new Error(
            "Expected documents to be present. Omit the argument to remove all documents.",
          );
        (this._index = new nt()),
          (this._documentCount = 0),
          (this._documentIds = new Map()),
          (this._idToShortId = new Map()),
          (this._fieldLength = new Map()),
          (this._avgFieldLength = []),
          (this._storedFields = new Map()),
          (this._nextId = 0);
      }
    }
    discard(e) {
      const t = this._idToShortId.get(e);
      if (null == t)
        throw new Error(
          `MiniSearch: cannot discard document with ID ${e}: it is not in the index`,
        );
      this._idToShortId.delete(e),
        this._documentIds.delete(t),
        this._storedFields.delete(t),
        (this._fieldLength.get(t) || []).forEach((e, n) => {
          this.removeFieldLength(t, n, this._documentCount, e);
        }),
        this._fieldLength.delete(t),
        (this._documentCount -= 1),
        (this._dirtCount += 1),
        this.maybeAutoVacuum();
    }
    maybeAutoVacuum() {
      if (!1 === this._options.autoVacuum) return;
      const {
        minDirtFactor: e,
        minDirtCount: t,
        batchSize: n,
        batchWait: r,
      } = this._options.autoVacuum;
      this.conditionalVacuum(
        { batchSize: n, batchWait: r },
        { minDirtCount: t, minDirtFactor: e },
      );
    }
    discardAll(e) {
      const t = this._options.autoVacuum;
      try {
        this._options.autoVacuum = !1;
        for (const t of e) this.discard(t);
      } finally {
        this._options.autoVacuum = t;
      }
      this.maybeAutoVacuum();
    }
    replace(e) {
      const { idField: t, extractField: n } = this._options,
        r = n(e, t);
      this.discard(r), this.add(e);
    }
    vacuum(e = {}) {
      return this.conditionalVacuum(e);
    }
    conditionalVacuum(e, t) {
      return this._currentVacuum
        ? ((this._enqueuedVacuumConditions =
            this._enqueuedVacuumConditions && t),
          null != this._enqueuedVacuum ||
            (this._enqueuedVacuum = this._currentVacuum.then(() => {
              const t = this._enqueuedVacuumConditions;
              return (
                (this._enqueuedVacuumConditions = St),
                this.performVacuuming(e, t)
              );
            })),
          this._enqueuedVacuum)
        : !1 === this.vacuumConditionsMet(t)
          ? Promise.resolve()
          : ((this._currentVacuum = this.performVacuuming(e)),
            this._currentVacuum);
    }
    performVacuuming(e, t) {
      return Je(this, void 0, void 0, function* () {
        const n = this._dirtCount;
        if (this.vacuumConditionsMet(t)) {
          const t = e.batchSize || vt.batchSize,
            r = e.batchWait || vt.batchWait;
          let s = 1;
          for (const [e, n] of this._index) {
            for (const [e, t] of n)
              for (const [r] of t)
                this._documentIds.has(r) ||
                  (t.size <= 1 ? n.delete(e) : t.delete(r));
            0 === this._index.get(e).size && this._index.delete(e),
              s % t == 0 && (yield new Promise((e) => setTimeout(e, r))),
              (s += 1);
          }
          this._dirtCount -= n;
        }
        yield null,
          (this._currentVacuum = this._enqueuedVacuum),
          (this._enqueuedVacuum = null);
      });
    }
    vacuumConditionsMet(e) {
      if (null == e) return !0;
      let { minDirtCount: t, minDirtFactor: n } = e;
      return (
        (t = t || It.minDirtCount),
        (n = n || It.minDirtFactor),
        this.dirtCount >= t && this.dirtFactor >= n
      );
    }
    get isVacuuming() {
      return null != this._currentVacuum;
    }
    get dirtCount() {
      return this._dirtCount;
    }
    get dirtFactor() {
      return this._dirtCount / (1 + this._documentCount + this._dirtCount);
    }
    has(e) {
      return this._idToShortId.has(e);
    }
    getStoredFields(e) {
      const t = this._idToShortId.get(e);
      if (null != t) return this._storedFields.get(t);
    }
    search(e, t = {}) {
      const { searchOptions: n } = this._options,
        r = Object.assign(Object.assign({}, n), t),
        s = this.executeQuery(e, t),
        i = [];
      for (const [e, { score: t, terms: n, match: o }] of s) {
        const s = n.length || 1,
          a = {
            id: this._documentIds.get(e),
            score: t * s,
            terms: Object.keys(o),
            queryTerms: n,
            match: o,
          };
        Object.assign(a, this._storedFields.get(e)),
          (null == r.filter || r.filter(a)) && i.push(a);
      }
      return (e === pt.wildcard && null == r.boostDocument) || i.sort(Tt), i;
    }
    autoSuggest(e, t = {}) {
      t = Object.assign(Object.assign({}, this._options.autoSuggestOptions), t);
      const n = new Map();
      for (const { score: r, terms: s } of this.search(e, t)) {
        const e = s.join(" "),
          t = n.get(e);
        null != t
          ? ((t.score += r), (t.count += 1))
          : n.set(e, { score: r, terms: s, count: 1 });
      }
      const r = [];
      for (const [e, { score: t, terms: s, count: i }] of n)
        r.push({ suggestion: e, terms: s, score: t / i });
      return r.sort(Tt), r;
    }
    get documentCount() {
      return this._documentCount;
    }
    get termCount() {
      return this._index.size;
    }
    static loadJSON(e, t) {
      if (null == t)
        throw new Error(
          "MiniSearch: loadJSON should be given the same options used when serializing the index",
        );
      return this.loadJS(JSON.parse(e), t);
    }
    static loadJSONAsync(e, t) {
      return Je(this, void 0, void 0, function* () {
        if (null == t)
          throw new Error(
            "MiniSearch: loadJSON should be given the same options used when serializing the index",
          );
        return this.loadJSAsync(JSON.parse(e), t);
      });
    }
    static getDefault(e) {
      if (wt.hasOwnProperty(e)) return ft(wt, e);
      throw new Error(`MiniSearch: unknown option "${e}"`);
    }
    static loadJS(e, t) {
      const {
          index: n,
          documentIds: r,
          fieldLength: s,
          storedFields: i,
          serializationVersion: o,
        } = e,
        a = this.instantiateMiniSearch(e, t);
      (a._documentIds = kt(r)),
        (a._fieldLength = kt(s)),
        (a._storedFields = kt(i));
      for (const [e, t] of a._documentIds) a._idToShortId.set(t, e);
      for (const [e, t] of n) {
        const n = new Map();
        for (const e of Object.keys(t)) {
          let r = t[e];
          1 === o && (r = r.ds), n.set(parseInt(e, 10), kt(r));
        }
        a._index.set(e, n);
      }
      return a;
    }
    static loadJSAsync(e, t) {
      return Je(this, void 0, void 0, function* () {
        const {
            index: n,
            documentIds: r,
            fieldLength: s,
            storedFields: i,
            serializationVersion: o,
          } = e,
          a = this.instantiateMiniSearch(e, t);
        (a._documentIds = yield Ot(r)),
          (a._fieldLength = yield Ot(s)),
          (a._storedFields = yield Ot(i));
        for (const [e, t] of a._documentIds) a._idToShortId.set(t, e);
        let c = 0;
        for (const [e, t] of n) {
          const n = new Map();
          for (const e of Object.keys(t)) {
            let r = t[e];
            1 === o && (r = r.ds), n.set(parseInt(e, 10), yield Ot(r));
          }
          ++c % 1e3 == 0 && (yield Dt(0)), a._index.set(e, n);
        }
        return a;
      });
    }
    static instantiateMiniSearch(e, t) {
      const {
        documentCount: n,
        nextId: r,
        fieldIds: s,
        averageFieldLength: i,
        dirtCount: o,
        serializationVersion: a,
      } = e;
      if (1 !== a && 2 !== a)
        throw new Error(
          "MiniSearch: cannot deserialize an index created with an incompatible version",
        );
      const c = new pt(t);
      return (
        (c._documentCount = n),
        (c._nextId = r),
        (c._idToShortId = new Map()),
        (c._fieldIds = s),
        (c._avgFieldLength = i),
        (c._dirtCount = o || 0),
        (c._index = new nt()),
        c
      );
    }
    executeQuery(e, t = {}) {
      if (e === pt.wildcard) return this.executeWildcardQuery(t);
      if ("string" != typeof e) {
        const n = Object.assign(Object.assign(Object.assign({}, t), e), {
            queries: void 0,
          }),
          r = e.queries.map((e) => this.executeQuery(e, n));
        return this.combineResults(r, n.combineWith);
      }
      const { tokenize: n, processTerm: r, searchOptions: s } = this._options,
        i = Object.assign(Object.assign({ tokenize: n, processTerm: r }, s), t),
        { tokenize: o, processTerm: a } = i,
        c = o(e)
          .flatMap((e) => a(e))
          .filter((e) => !!e)
          .map(yt(i))
          .map((e) => this.executeQuerySpec(e, i));
      return this.combineResults(c, i.combineWith);
    }
    executeQuerySpec(e, t) {
      const n = Object.assign(
          Object.assign({}, this._options.searchOptions),
          t,
        ),
        r = (n.fields || this._options.fields).reduce(
          (e, t) =>
            Object.assign(Object.assign({}, e), { [t]: ft(n.boost, t) || 1 }),
          {},
        ),
        { boostDocument: s, weights: i, maxFuzzy: o, bm25: a } = n,
        { fuzzy: c, prefix: u } = Object.assign(
          Object.assign({}, bt.weights),
          i,
        ),
        l = this._index.get(e.term),
        h = this.termResults(e.term, e.term, 1, e.termBoost, l, r, s, a);
      let d, p;
      if ((e.prefix && (d = this._index.atPrefix(e.term)), e.fuzzy)) {
        const t = !0 === e.fuzzy ? 0.2 : e.fuzzy,
          n = t < 1 ? Math.min(o, Math.round(e.term.length * t)) : t;
        n && (p = this._index.fuzzyGet(e.term, n));
      }
      if (d)
        for (const [t, n] of d) {
          const i = t.length - e.term.length;
          if (!i) continue;
          null == p || p.delete(t);
          const o = (u * t.length) / (t.length + 0.3 * i);
          this.termResults(e.term, t, o, e.termBoost, n, r, s, a, h);
        }
      if (p)
        for (const t of p.keys()) {
          const [n, i] = p.get(t);
          if (!i) continue;
          const o = (c * t.length) / (t.length + i);
          this.termResults(e.term, t, o, e.termBoost, n, r, s, a, h);
        }
      return h;
    }
    executeWildcardQuery(e) {
      const t = new Map(),
        n = Object.assign(Object.assign({}, this._options.searchOptions), e);
      for (const [e, r] of this._documentIds) {
        const s = n.boostDocument
          ? n.boostDocument(r, "", this._storedFields.get(e))
          : 1;
        t.set(e, { score: s, terms: [], match: {} });
      }
      return t;
    }
    combineResults(e, t = lt) {
      if (0 === e.length) return new Map();
      const n = t.toLowerCase(),
        r = gt[n];
      if (!r) throw new Error(`Invalid combination operator: ${t}`);
      return e.reduce(r) || new Map();
    }
    toJSON() {
      const e = [];
      for (const [t, n] of this._index) {
        const r = {};
        for (const [e, t] of n) r[e] = Object.fromEntries(t);
        e.push([t, r]);
      }
      return {
        documentCount: this._documentCount,
        nextId: this._nextId,
        documentIds: Object.fromEntries(this._documentIds),
        fieldIds: this._fieldIds,
        fieldLength: Object.fromEntries(this._fieldLength),
        averageFieldLength: this._avgFieldLength,
        storedFields: Object.fromEntries(this._storedFields),
        dirtCount: this._dirtCount,
        index: e,
        serializationVersion: 2,
      };
    }
    termResults(e, t, n, r, s, i, o, a, c = new Map()) {
      if (null == s) return c;
      for (const u of Object.keys(i)) {
        const l = i[u],
          h = this._fieldIds[u],
          d = s.get(h);
        if (null == d) continue;
        let p = d.size;
        const f = this._avgFieldLength[h];
        for (const s of d.keys()) {
          if (!this._documentIds.has(s)) {
            this.removeTerm(h, s, t), (p -= 1);
            continue;
          }
          const i = o
            ? o(this._documentIds.get(s), t, this._storedFields.get(s))
            : 1;
          if (!i) continue;
          const g = d.get(s),
            m = this._fieldLength.get(s)[h],
            y = n * r * l * i * mt(g, p, this._documentCount, m, f, a),
            w = c.get(s);
          if (w) {
            (w.score += y), Et(w.terms, e);
            const n = ft(w.match, t);
            n ? n.push(u) : (w.match[t] = [u]);
          } else c.set(s, { score: y, terms: [e], match: { [t]: [u] } });
        }
      }
      return c;
    }
    addTerm(e, t, n) {
      const r = this._index.fetch(n, Ct);
      let s = r.get(e);
      if (null == s) (s = new Map()), s.set(t, 1), r.set(e, s);
      else {
        const e = s.get(t);
        s.set(t, (e || 0) + 1);
      }
    }
    removeTerm(e, t, n) {
      if (!this._index.has(n)) return void this.warnDocumentChanged(t, e, n);
      const r = this._index.fetch(n, Ct),
        s = r.get(e);
      null == s || null == s.get(t)
        ? this.warnDocumentChanged(t, e, n)
        : s.get(t) <= 1
          ? s.size <= 1
            ? r.delete(e)
            : s.delete(t)
          : s.set(t, s.get(t) - 1),
        0 === this._index.get(n).size && this._index.delete(n);
    }
    warnDocumentChanged(e, t, n) {
      for (const r of Object.keys(this._fieldIds))
        if (this._fieldIds[r] === t)
          return void this._options.logger(
            "warn",
            `MiniSearch: document with ID ${this._documentIds.get(e)} has changed before removal: term "${n}" was not present in field "${r}". Removing a document after it has changed can corrupt the index!`,
            "version_conflict",
          );
    }
    addDocumentId(e) {
      const t = this._nextId;
      return (
        this._idToShortId.set(e, t),
        this._documentIds.set(t, e),
        (this._documentCount += 1),
        (this._nextId += 1),
        t
      );
    }
    addFields(e) {
      for (let t = 0; t < e.length; t++) this._fieldIds[e[t]] = t;
    }
    addFieldLength(e, t, n, r) {
      let s = this._fieldLength.get(e);
      null == s && this._fieldLength.set(e, (s = [])), (s[t] = r);
      const i = (this._avgFieldLength[t] || 0) * n + r;
      this._avgFieldLength[t] = i / (n + 1);
    }
    removeFieldLength(e, t, n, r) {
      if (1 === n) return void (this._avgFieldLength[t] = 0);
      const s = this._avgFieldLength[t] * n - r;
      this._avgFieldLength[t] = s / (n - 1);
    }
    saveStoredFields(e, t) {
      const { storeFields: n, extractField: r } = this._options;
      if (null == n || 0 === n.length) return;
      let s = this._storedFields.get(e);
      null == s && this._storedFields.set(e, (s = {}));
      for (const e of n) {
        const n = r(t, e);
        void 0 !== n && (s[e] = n);
      }
    }
  }
  pt.wildcard = Symbol("*");
  const ft = (e, t) =>
      Object.prototype.hasOwnProperty.call(e, t) ? e[t] : void 0,
    gt = {
      [lt]: (e, t) => {
        for (const n of t.keys()) {
          const r = e.get(n);
          if (null == r) e.set(n, t.get(n));
          else {
            const { score: e, terms: s, match: i } = t.get(n);
            (r.score = r.score + e),
              (r.match = Object.assign(r.match, i)),
              xt(r.terms, s);
          }
        }
        return e;
      },
      [ht]: (e, t) => {
        const n = new Map();
        for (const r of t.keys()) {
          const s = e.get(r);
          if (null == s) continue;
          const { score: i, terms: o, match: a } = t.get(r);
          xt(s.terms, o),
            n.set(r, {
              score: s.score + i,
              terms: s.terms,
              match: Object.assign(s.match, a),
            });
        }
        return n;
      },
      [dt]: (e, t) => {
        for (const n of t.keys()) e.delete(n);
        return e;
      },
    },
    mt = (e, t, n, r, s, i) => {
      const { k: o, b: a, d: c } = i;
      return (
        Math.log(1 + (n - t + 0.5) / (t + 0.5)) *
        (c + (e * (o + 1)) / (e + o * (1 - a + (a * r) / s)))
      );
    },
    yt = (e) => (t, n, r) => ({
      term: t,
      fuzzy: "function" == typeof e.fuzzy ? e.fuzzy(t, n, r) : e.fuzzy || !1,
      prefix:
        "function" == typeof e.prefix ? e.prefix(t, n, r) : !0 === e.prefix,
      termBoost: "function" == typeof e.boostTerm ? e.boostTerm(t, n, r) : 1,
    }),
    wt = {
      idField: "id",
      extractField: (e, t) => e[t],
      tokenize: (e) => e.split(At),
      processTerm: (e) => e.toLowerCase(),
      fields: void 0,
      searchOptions: void 0,
      storeFields: [],
      logger: (e, t) => {
        "function" ==
          typeof (null === console || void 0 === console
            ? void 0
            : console[e]) && console[e](t);
      },
      autoVacuum: !0,
    },
    bt = {
      combineWith: lt,
      prefix: !1,
      fuzzy: !1,
      maxFuzzy: 6,
      boost: {},
      weights: { fuzzy: 0.45, prefix: 0.375 },
      bm25: { k: 1.2, b: 0.7, d: 0.5 },
    },
    _t = { combineWith: "and", prefix: (e, t, n) => t === n.length - 1 },
    vt = { batchSize: 1e3, batchWait: 10 },
    St = { minDirtFactor: 0.1, minDirtCount: 20 },
    It = Object.assign(Object.assign({}, vt), St),
    Et = (e, t) => {
      e.includes(t) || e.push(t);
    },
    xt = (e, t) => {
      for (const n of t) e.includes(n) || e.push(n);
    },
    Tt = ({ score: e }, { score: t }) => t - e,
    Ct = () => new Map(),
    kt = (e) => {
      const t = new Map();
      for (const n of Object.keys(e)) t.set(parseInt(n, 10), e[n]);
      return t;
    },
    Ot = (e) =>
      Je(void 0, void 0, void 0, function* () {
        const t = new Map();
        let n = 0;
        for (const r of Object.keys(e))
          t.set(parseInt(r, 10), e[r]), ++n % 1e3 == 0 && (yield Dt(0));
        return t;
      }),
    Dt = (e) => new Promise((t) => setTimeout(t, e)),
    At = /[\n\r\p{Z}\p{P}]+/u;
  class Rt {
    constructor(e) {
      (this.localDb = e),
        (this.knownRecipeIds = new Set()),
        (this.miniSearchOptions = {
          fields: ["text"],
          storeFields: ["recipeId", "recipeTitle"],
        }),
        (this.initPromise = this.populateFromLocalDb()),
        (this.miniSearch = new pt(this.miniSearchOptions));
    }
    search(e) {
      return Array.from(this.miniSearch.search(e, { prefix: !0 }));
    }
    async populateFromLocalDb() {
      performance.mark("startIndexLoad");
      const e = await this.localDb.get(Ve.KV, Ke.RecipeSearchIndex);
      if (!e) return;
      try {
        (this.miniSearch = pt.loadJSON(e.value, this.miniSearchOptions)),
          this.repopulateKnownIds();
      } catch (e) {
        console.error("Failed to load MiniSearch index from local DB", e);
      }
      performance.mark("endIndexLoad");
      const t = performance.measure(
        "indexLoadTime",
        "startIndexLoad",
        "endIndexLoad",
      );
      console.log(
        `Loading index took ${t.duration}ms. ${this.knownRecipeIds.size} artifacts loaded.`,
      );
    }
    repopulateKnownIds() {
      const e = this.getStoredFields();
      this.knownRecipeIds = new Set();
      for (const t of e) this.knownRecipeIds.add(t.recipeId);
    }
    getStoredFields() {
      return this.miniSearch._storedFields.values();
    }
    getStoredFieldsForRecipeId(e) {
      return this.miniSearch.getStoredFields(e);
    }
    onReady() {
      return this.initPromise;
    }
    getKnownIndexIds() {
      return this.knownRecipeIds;
    }
    async unindexRecipe(e) {
      await this.initPromise,
        this.miniSearch.discard(e),
        this.knownRecipeIds.delete(e),
        this.scheduleSave();
    }
    async indexRecipe(e) {
      await this.initPromise;
      const t = {
        id: e.id,
        recipeId: e.id,
        text: `\n        ${e.title}\n        ${e.description}\n        ${e.ingredients}\n        ${e.instructions}\n      `,
      };
      this.miniSearch.has(e.id)
        ? this.miniSearch.replace(t)
        : this.miniSearch.add(t),
        this.knownRecipeIds.add(e.id),
        this.scheduleSave();
    }
    scheduleSave() {
      clearTimeout(this.saveTimeout),
        (this.saveTimeout = setTimeout(() => {
          this.saveToLocalDB();
        }, 1e4)),
        this.maxSaveTimeout ||
          (this.maxSaveTimeout = setTimeout(() => {
            this.saveToLocalDB();
          }, 12e4));
    }
    async saveToLocalDB() {
      clearTimeout(this.saveTimeout),
        clearTimeout(this.maxSaveTimeout),
        (await this.localDb.get(Ve.KV, Ke.RecipeSearchIndex))
          ? await this.localDb.put(Ve.KV, {
              key: Ke.RecipeSearchIndex,
              value: JSON.stringify(this.miniSearch),
            })
          : await this.localDb.add(Ve.KV, {
              key: Ke.RecipeSearchIndex,
              value: JSON.stringify(this.miniSearch),
            });
    }
    async destroy() {
      await this.saveToLocalDB(),
        clearTimeout(this.saveTimeout),
        clearTimeout(this.maxSaveTimeout);
    }
  }
  function Lt(e) {
    return e;
  }
  function Pt(e) {
    const t = {
      subscribe(t) {
        let n = null,
          r = !1,
          s = !1,
          i = !1;
        function o() {
          null !== n
            ? s ||
              ((s = !0), "function" == typeof n ? n() : n && n.unsubscribe())
            : (i = !0);
        }
        return (
          (n = e({
            next(e) {
              r || t.next?.(e);
            },
            error(e) {
              r || ((r = !0), t.error?.(e), o());
            },
            complete() {
              r || ((r = !0), t.complete?.(), o());
            },
          })),
          i && o(),
          { unsubscribe: o }
        );
      },
      pipe(...e) {
        return (
          0 === (n = e).length
            ? Lt
            : 1 === n.length
              ? n[0]
              : function (e) {
                  return n.reduce((e, t) => t(e), e);
                }
        )(t);
        var n;
      },
    };
    return t;
  }
  class Nt extends Error {
    constructor(e) {
      super(e),
        (this.name = "ObservableAbortError"),
        Object.setPrototypeOf(this, Nt.prototype);
    }
  }
  function Mt(e) {
    const t = Object.create(null);
    for (const n in e) t[e[n]] = n;
    return t;
  }
  const jt = {
    PARSE_ERROR: -32700,
    BAD_REQUEST: -32600,
    INTERNAL_SERVER_ERROR: -32603,
    NOT_IMPLEMENTED: -32603,
    UNAUTHORIZED: -32001,
    FORBIDDEN: -32003,
    NOT_FOUND: -32004,
    METHOD_NOT_SUPPORTED: -32005,
    TIMEOUT: -32008,
    CONFLICT: -32009,
    PRECONDITION_FAILED: -32012,
    PAYLOAD_TOO_LARGE: -32013,
    UNPROCESSABLE_CONTENT: -32022,
    TOO_MANY_REQUESTS: -32029,
    CLIENT_CLOSED_REQUEST: -32099,
  };
  Mt(jt), Mt(jt);
  const qt = () => {};
  function Ft(e, t) {
    return new Proxy(qt, {
      get(n, r) {
        if ("string" == typeof r && "then" !== r) return Ft(e, [...t, r]);
      },
      apply(n, r, s) {
        const i = "apply" === t[t.length - 1];
        return e({
          args: i ? (s.length >= 2 ? s[1] : []) : s,
          path: i ? t.slice(0, -1) : t,
        });
      },
    });
  }
  const Ut = (e) => Ft(e, []);
  class Bt extends Error {}
  function zt(e) {
    if (e instanceof Error) return e;
    const t = typeof e;
    if ("undefined" !== t && "function" !== t && null !== e) {
      if ("object" !== t) return new Error(String(e));
      if ((n = e) && !Array.isArray(n) && "object" == typeof n) {
        const t = new Bt();
        for (const n in e) t[n] = e[n];
        return t;
      }
      var n;
    }
  }
  function $t(e) {
    return !!e && !Array.isArray(e) && "object" == typeof e;
  }
  class Vt extends Error {
    constructor() {
      super("Unable to transform response from server");
    }
  }
  function Kt(e, t) {
    let n;
    try {
      n = (function (e, t) {
        if ("error" in e) {
          const n = t.transformer.deserialize(e.error);
          return { ok: !1, error: { ...e, error: n } };
        }
        return {
          ok: !0,
          result: {
            ...e.result,
            ...((!e.result.type || "data" === e.result.type) && {
              type: "data",
              data: t.transformer.deserialize(e.result.data),
            }),
          },
        };
      })(e, t);
    } catch (e) {
      throw new Vt();
    }
    if (!(n.ok || ($t(n.error.error) && "number" == typeof n.error.error.code)))
      throw new Vt();
    if (n.ok && !$t(n.result)) throw new Vt();
    return n;
  }
  class Ht extends Error {
    static from(e, t = {}) {
      const n = e;
      return (function (e) {
        return (
          e instanceof Ht ||
          (e instanceof Error && "TRPCClientError" === e.name)
        );
      })(n)
        ? (t.meta && (n.meta = { ...n.meta, ...t.meta }), n)
        : $t((r = n)) &&
            $t(r.error) &&
            "number" == typeof r.error.code &&
            "string" == typeof r.error.message
          ? new Ht(n.error.message, { ...t, result: n })
          : n instanceof Error
            ? new Ht(n.message, { ...t, cause: zt(n) })
            : new Ht("Unknown error", { ...t, cause: n });
      var r;
    }
    constructor(e, t) {
      const n = t?.cause;
      super(e, { cause: n }),
        (this.meta = t?.meta),
        (this.cause = n),
        (this.shape = t?.result?.error),
        (this.data = t?.result?.error.data),
        (this.name = "TRPCClientError"),
        Object.setPrototypeOf(this, Ht.prototype);
    }
  }
  const Wt = (e) => "function" == typeof e;
  function Gt(e) {
    return {
      url: e.url.toString().replace(/\/$/, ""),
      fetch: e.fetch,
      AbortController:
        ((t = e.AbortController),
        t ||
          ("undefined" != typeof window && window.AbortController
            ? window.AbortController
            : "undefined" != typeof globalThis && globalThis.AbortController
              ? globalThis.AbortController
              : null)),
    };
    var t;
  }
  const Jt = { query: "GET", mutation: "POST" };
  function Yt(e) {
    return "input" in e
      ? e.runtime.transformer.serialize(e.input)
      : (function (e) {
          const t = {};
          for (let n = 0; n < e.length; n++) {
            const r = e[n];
            t[n] = r;
          }
          return t;
        })(e.inputs.map((t) => e.runtime.transformer.serialize(t)));
  }
  const Qt = (e) => {
      let t = e.url + "/" + e.path;
      const n = [];
      if (("inputs" in e && n.push("batch=1"), "query" === e.type)) {
        const t = Yt(e);
        void 0 !== t &&
          n.push(`input=${encodeURIComponent(JSON.stringify(t))}`);
      }
      return n.length && (t += "?" + n.join("&")), t;
    },
    Zt = (e) => {
      if ("query" === e.type) return;
      const t = Yt(e);
      return void 0 !== t ? JSON.stringify(t) : void 0;
    },
    Xt = (e) =>
      tn({
        ...e,
        contentTypeHeader: "application/json",
        getUrl: Qt,
        getBody: Zt,
      });
  async function en(e, t) {
    const n = e.getUrl(e),
      r = e.getBody(e),
      { type: s } = e,
      i = await e.headers();
    if ("subscription" === s)
      throw new Error("Subscriptions should use wsLink");
    const o = {
      ...(e.contentTypeHeader ? { "content-type": e.contentTypeHeader } : {}),
      ...(e.batchModeHeader ? { "trpc-batch-mode": e.batchModeHeader } : {}),
      ...i,
    };
    return (function (e) {
      if (e) return e;
      if ("undefined" != typeof window && Wt(window.fetch)) return window.fetch;
      if ("undefined" != typeof globalThis && Wt(globalThis.fetch))
        return globalThis.fetch;
      throw new Error("No fetch implementation found");
    })(e.fetch)(n, { method: Jt[s], signal: t?.signal, body: r, headers: o });
  }
  function tn(e) {
    const t = e.AbortController ? new e.AbortController() : null,
      n = {};
    let r = !1;
    return {
      promise: new Promise((s, i) => {
        en(e, t)
          .then((e) => ((n.response = e), (r = !0), e.json()))
          .then((e) => {
            (n.responseJSON = e), s({ json: e, meta: n });
          })
          .catch((e) => {
            (r = !0), i(Ht.from(e, { meta: n }));
          });
      }),
      cancel: () => {
        r || t?.abort();
      },
    };
  }
  const nn = () => {
    throw new Error(
      "Something went wrong. Please submit an issue at https://github.com/trpc/trpc/issues/new",
    );
  };
  function rn(e) {
    let t = null,
      n = null;
    function r() {
      const r = (function (t) {
        const n = [[]];
        let r = 0;
        for (;;) {
          const s = t[r];
          if (!s) break;
          const i = n[n.length - 1];
          s.aborted
            ? (s.reject?.(new Error("Aborted")), r++)
            : e.validate(i.concat(s).map((e) => e.key))
              ? (i.push(s), r++)
              : 0 !== i.length
                ? n.push([])
                : (s.reject?.(
                    new Error("Input is too big for a single dispatch"),
                  ),
                  r++);
        }
        return n;
      })(t);
      clearTimeout(n), (n = null), (t = null);
      for (const t of r) {
        if (!t.length) continue;
        const n = { items: t, cancel: nn };
        for (const e of t) e.batch = n;
        const r = (e, t) => {
            const r = n.items[e];
            r.resolve?.(t),
              (r.batch = null),
              (r.reject = null),
              (r.resolve = null);
          },
          { promise: s, cancel: i } = e.fetch(
            n.items.map((e) => e.key),
            r,
          );
        (n.cancel = i),
          s
            .then((e) => {
              for (let t = 0; t < e.length; t++) {
                const n = e[t];
                r(t, n);
              }
              for (const e of n.items)
                e.reject?.(new Error("Missing result")), (e.batch = null);
            })
            .catch((e) => {
              for (const t of n.items) t.reject?.(e), (t.batch = null);
            });
      }
    }
    return {
      load: function (e) {
        const s = { aborted: !1, key: e, batch: null, resolve: nn, reject: nn },
          i = new Promise((e, n) => {
            (s.reject = n), (s.resolve = e), t || (t = []), t.push(s);
          });
        return (
          n || (n = setTimeout(r)),
          {
            promise: i,
            cancel: () => {
              (s.aborted = !0),
                s.batch?.items.every((e) => e.aborted) &&
                  (s.batch.cancel(), (s.batch = null));
            },
          }
        );
      },
    };
  }
  function sn(e) {
    return function (t) {
      const n = Gt(t),
        r = t.maxURLLength ?? 1 / 0;
      return (s) => {
        const i = (i) => ({
            validate: (e) => {
              if (r === 1 / 0) return !0;
              const t = e.map((e) => e.path).join(","),
                o = e.map((e) => e.input);
              return (
                Qt({ ...n, runtime: s, type: i, path: t, inputs: o }).length <=
                r
              );
            },
            fetch: e({ ...n, runtime: s, type: i, opts: t }),
          }),
          o = rn(i("query")),
          a = rn(i("mutation")),
          c = { query: o, subscription: rn(i("subscription")), mutation: a };
        return ({ op: e }) =>
          Pt((t) => {
            const n = c[e.type],
              { promise: r, cancel: i } = n.load(e);
            let o;
            return (
              r
                .then((e) => {
                  o = e;
                  const n = Kt(e.json, s);
                  n.ok
                    ? (t.next({ context: e.meta, result: n.result }),
                      t.complete())
                    : t.error(Ht.from(n.error, { meta: e.meta }));
                })
                .catch((e) => {
                  t.error(Ht.from(e, { meta: o?.meta }));
                }),
              () => {
                i();
              }
            );
          });
      };
    };
  }
  function on(e) {
    return (t) => {
      const n = Gt(t);
      return (r) =>
        ({ op: s }) =>
          Pt((i) => {
            const { path: o, input: a, type: c } = s,
              { promise: u, cancel: l } = e.requester({
                ...n,
                runtime: r,
                type: c,
                path: o,
                input: a,
                headers: () =>
                  t.headers
                    ? "function" == typeof t.headers
                      ? t.headers({ op: s })
                      : t.headers
                    : {},
              });
            let h;
            return (
              u
                .then((e) => {
                  h = e.meta;
                  const t = Kt(e.json, r);
                  t.ok
                    ? (i.next({ context: e.meta, result: t.result }),
                      i.complete())
                    : i.error(Ht.from(t.error, { meta: h }));
                })
                .catch((e) => {
                  i.error(Ht.from(e, { meta: h }));
                }),
              () => {
                l();
              }
            );
          });
    };
  }
  sn((e) => (t) => {
    const n = t.map((e) => e.path).join(","),
      r = t.map((e) => e.input),
      { promise: s, cancel: i } = Xt({
        ...e,
        path: n,
        inputs: r,
        headers: () =>
          e.opts.headers
            ? "function" == typeof e.opts.headers
              ? e.opts.headers({ opList: t })
              : e.opts.headers
            : {},
      });
    return {
      promise: s.then((e) =>
        (Array.isArray(e.json) ? e.json : t.map(() => e.json)).map((t) => ({
          meta: e.meta,
          json: t,
        })),
      ),
      cancel: i,
    };
  });
  const an = on({ requester: Xt });
  Error;
  const cn = { query: "query", mutate: "mutation", subscribe: "subscription" };
  sn((e) => {
    const t = (function (e) {
      if (e) return e;
      if ("undefined" != typeof window && window.TextDecoder)
        return new window.TextDecoder();
      if ("undefined" != typeof globalThis && globalThis.TextDecoder)
        return new globalThis.TextDecoder();
      throw new Error("No TextDecoder implementation found");
    })(e.opts.textDecoder);
    return (n, r) => {
      const s = n.map((e) => e.path).join(","),
        i = n.map((e) => e.input),
        { cancel: o, promise: a } = ((e, t) => {
          const n = e.AbortController ? new e.AbortController() : null;
          return {
            cancel: () => n?.abort(),
            promise: en(
              {
                ...e,
                contentTypeHeader: "application/json",
                batchModeHeader: "stream",
                getUrl: Qt,
                getBody: Zt,
              },
              n,
            ).then(async (r) => {
              if (!r.body) throw new Error("Received response without body");
              const s = { response: r };
              return (async function (e) {
                const t = e.parse ?? JSON.parse;
                await (async function (e, t, n) {
                  let r = "";
                  const s = (e) => {
                    const s = n.decode(e).split("\n");
                    if (1 === s.length) r += s[0];
                    else if (s.length > 1) {
                      t(r + s[0]);
                      for (let e = 1; e < s.length - 1; e++) t(s[e]);
                      r = s[s.length - 1];
                    }
                  };
                  "getReader" in e
                    ? await (async function (e, t) {
                        const n = e.getReader();
                        let r = await n.read();
                        for (; !r.done; ) t(r.value), (r = await n.read());
                      })(e, s)
                    : await (function (e, t) {
                        return new Promise((n) => {
                          e.on("data", t), e.on("end", n);
                        });
                      })(e, s),
                    t(r);
                })(
                  e.readableStream,
                  (n) => {
                    if (e.signal?.aborted) return;
                    if (!n || "}" === n) return;
                    const r = n.indexOf(":"),
                      s = n.substring(2, r - 1),
                      i = n.substring(r + 1);
                    e.onSingle(Number(s), t(i));
                  },
                  e.textDecoder,
                );
              })({
                readableStream: r.body,
                onSingle: t,
                parse: (e) => ({ json: JSON.parse(e), meta: s }),
                signal: n?.signal,
                textDecoder: e.textDecoder,
              });
            }),
          };
        })(
          {
            ...e,
            textDecoder: t,
            path: s,
            inputs: i,
            headers: () =>
              e.opts.headers
                ? "function" == typeof e.opts.headers
                  ? e.opts.headers({ opList: n })
                  : e.opts.headers
                : {},
          },
          (e, t) => {
            r(e, t);
          },
        );
      return { promise: a.then(() => []), cancel: o };
    };
  });
  const un = (e) => {
    if ("input" in e) {
      if (!(e.input instanceof FormData))
        throw new Error("Input is not FormData");
      return e.input;
    }
  };
  on({
    requester: (e) => {
      if ("mutation" !== e.type)
        throw new Error("We only handle mutations with formdata");
      return tn({ ...e, getUrl: () => `${e.url}/${e.path}`, getBody: un });
    },
  });
  var ln,
    hn = (function () {
      function e() {
        (this.keyToValue = new Map()), (this.valueToKey = new Map());
      }
      return (
        (e.prototype.set = function (e, t) {
          this.keyToValue.set(e, t), this.valueToKey.set(t, e);
        }),
        (e.prototype.getByKey = function (e) {
          return this.keyToValue.get(e);
        }),
        (e.prototype.getByValue = function (e) {
          return this.valueToKey.get(e);
        }),
        (e.prototype.clear = function () {
          this.keyToValue.clear(), this.valueToKey.clear();
        }),
        e
      );
    })(),
    dn = (function () {
      function e(e) {
        (this.generateIdentifier = e), (this.kv = new hn());
      }
      return (
        (e.prototype.register = function (e, t) {
          this.kv.getByValue(e) ||
            (t || (t = this.generateIdentifier(e)), this.kv.set(t, e));
        }),
        (e.prototype.clear = function () {
          this.kv.clear();
        }),
        (e.prototype.getIdentifier = function (e) {
          return this.kv.getByValue(e);
        }),
        (e.prototype.getValue = function (e) {
          return this.kv.getByKey(e);
        }),
        e
      );
    })(),
    pn =
      ((ln = function (e, t) {
        return (
          (ln =
            Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array &&
              function (e, t) {
                e.__proto__ = t;
              }) ||
            function (e, t) {
              for (var n in t)
                Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
            }),
          ln(e, t)
        );
      }),
      function (e, t) {
        if ("function" != typeof t && null !== t)
          throw new TypeError(
            "Class extends value " +
              String(t) +
              " is not a constructor or null",
          );
        function n() {
          this.constructor = e;
        }
        ln(e, t),
          (e.prototype =
            null === t
              ? Object.create(t)
              : ((n.prototype = t.prototype), new n()));
      }),
    fn = (function (e) {
      function t() {
        var t =
          e.call(this, function (e) {
            return e.name;
          }) || this;
        return (t.classToAllowedProps = new Map()), t;
      }
      return (
        pn(t, e),
        (t.prototype.register = function (t, n) {
          "object" == typeof n
            ? (n.allowProps && this.classToAllowedProps.set(t, n.allowProps),
              e.prototype.register.call(this, t, n.identifier))
            : e.prototype.register.call(this, t, n);
        }),
        (t.prototype.getAllowedProps = function (e) {
          return this.classToAllowedProps.get(e);
        }),
        t
      );
    })(dn),
    gn = function (e, t) {
      var n = "function" == typeof Symbol && e[Symbol.iterator];
      if (!n) return e;
      var r,
        s,
        i = n.call(e),
        o = [];
      try {
        for (; (void 0 === t || t-- > 0) && !(r = i.next()).done; )
          o.push(r.value);
      } catch (e) {
        s = { error: e };
      } finally {
        try {
          r && !r.done && (n = i.return) && n.call(i);
        } finally {
          if (s) throw s.error;
        }
      }
      return o;
    };
  function mn(e, t) {
    Object.entries(e).forEach(function (e) {
      var n = gn(e, 2),
        r = n[0],
        s = n[1];
      return t(s, r);
    });
  }
  function yn(e, t) {
    return -1 !== e.indexOf(t);
  }
  function wn(e, t) {
    for (var n = 0; n < e.length; n++) {
      var r = e[n];
      if (t(r)) return r;
    }
  }
  var bn = (function () {
      function e() {
        this.transfomers = {};
      }
      return (
        (e.prototype.register = function (e) {
          this.transfomers[e.name] = e;
        }),
        (e.prototype.findApplicable = function (e) {
          return (function (e, t) {
            var n = (function (e) {
              if ("values" in Object) return Object.values(e);
              var t = [];
              for (var n in e) e.hasOwnProperty(n) && t.push(e[n]);
              return t;
            })(e);
            if ("find" in n) return n.find(t);
            for (var r = n, s = 0; s < r.length; s++) {
              var i = r[s];
              if (t(i)) return i;
            }
          })(this.transfomers, function (t) {
            return t.isApplicable(e);
          });
        }),
        (e.prototype.findByName = function (e) {
          return this.transfomers[e];
        }),
        e
      );
    })(),
    _n = function (e) {
      return void 0 === e;
    },
    vn = function (e) {
      return (
        "object" == typeof e &&
        null !== e &&
        e !== Object.prototype &&
        (null === Object.getPrototypeOf(e) ||
          Object.getPrototypeOf(e) === Object.prototype)
      );
    },
    Sn = function (e) {
      return vn(e) && 0 === Object.keys(e).length;
    },
    In = function (e) {
      return Array.isArray(e);
    },
    En = function (e) {
      return e instanceof Map;
    },
    xn = function (e) {
      return e instanceof Set;
    },
    Tn = function (e) {
      return (
        "Symbol" ===
        (function (e) {
          return Object.prototype.toString.call(e).slice(8, -1);
        })(e)
      );
    },
    Cn = function (e) {
      return "number" == typeof e && isNaN(e);
    },
    kn = function (e) {
      return e.replace(/\./g, "\\.");
    },
    On = function (e) {
      return e.map(String).map(kn).join(".");
    },
    Dn = function (e) {
      for (var t = [], n = "", r = 0; r < e.length; r++) {
        var s = e.charAt(r);
        "\\" === s && "." === e.charAt(r + 1)
          ? ((n += "."), r++)
          : "." === s
            ? (t.push(n), (n = ""))
            : (n += s);
      }
      var i = n;
      return t.push(i), t;
    },
    An = function () {
      return (
        (An =
          Object.assign ||
          function (e) {
            for (var t, n = 1, r = arguments.length; n < r; n++)
              for (var s in (t = arguments[n]))
                Object.prototype.hasOwnProperty.call(t, s) && (e[s] = t[s]);
            return e;
          }),
        An.apply(this, arguments)
      );
    },
    Rn = function (e, t) {
      var n = "function" == typeof Symbol && e[Symbol.iterator];
      if (!n) return e;
      var r,
        s,
        i = n.call(e),
        o = [];
      try {
        for (; (void 0 === t || t-- > 0) && !(r = i.next()).done; )
          o.push(r.value);
      } catch (e) {
        s = { error: e };
      } finally {
        try {
          r && !r.done && (n = i.return) && n.call(i);
        } finally {
          if (s) throw s.error;
        }
      }
      return o;
    },
    Ln = function (e, t) {
      for (var n = 0, r = t.length, s = e.length; n < r; n++, s++) e[s] = t[n];
      return e;
    };
  function Pn(e, t, n, r) {
    return { isApplicable: e, annotation: t, transform: n, untransform: r };
  }
  var Nn = [
    Pn(
      _n,
      "undefined",
      function () {
        return null;
      },
      function () {},
    ),
    Pn(
      function (e) {
        return "bigint" == typeof e;
      },
      "bigint",
      function (e) {
        return e.toString();
      },
      function (e) {
        return "undefined" != typeof BigInt
          ? BigInt(e)
          : (console.error("Please add a BigInt polyfill."), e);
      },
    ),
    Pn(
      function (e) {
        return e instanceof Date && !isNaN(e.valueOf());
      },
      "Date",
      function (e) {
        return e.toISOString();
      },
      function (e) {
        return new Date(e);
      },
    ),
    Pn(
      function (e) {
        return e instanceof Error;
      },
      "Error",
      function (e, t) {
        var n = { name: e.name, message: e.message };
        return (
          t.allowedErrorProps.forEach(function (t) {
            n[t] = e[t];
          }),
          n
        );
      },
      function (e, t) {
        var n = new Error(e.message);
        return (
          (n.name = e.name),
          (n.stack = e.stack),
          t.allowedErrorProps.forEach(function (t) {
            n[t] = e[t];
          }),
          n
        );
      },
    ),
    Pn(
      function (e) {
        return e instanceof RegExp;
      },
      "regexp",
      function (e) {
        return "" + e;
      },
      function (e) {
        var t = e.slice(1, e.lastIndexOf("/")),
          n = e.slice(e.lastIndexOf("/") + 1);
        return new RegExp(t, n);
      },
    ),
    Pn(
      xn,
      "set",
      function (e) {
        return Ln([], Rn(e.values()));
      },
      function (e) {
        return new Set(e);
      },
    ),
    Pn(
      En,
      "map",
      function (e) {
        return Ln([], Rn(e.entries()));
      },
      function (e) {
        return new Map(e);
      },
    ),
    Pn(
      function (e) {
        return Cn(e) || (t = e) === 1 / 0 || t === -1 / 0;
        var t;
      },
      "number",
      function (e) {
        return Cn(e) ? "NaN" : e > 0 ? "Infinity" : "-Infinity";
      },
      Number,
    ),
    Pn(
      function (e) {
        return 0 === e && 1 / e == -1 / 0;
      },
      "number",
      function () {
        return "-0";
      },
      Number,
    ),
    Pn(
      function (e) {
        return e instanceof URL;
      },
      "URL",
      function (e) {
        return e.toString();
      },
      function (e) {
        return new URL(e);
      },
    ),
  ];
  function Mn(e, t, n, r) {
    return { isApplicable: e, annotation: t, transform: n, untransform: r };
  }
  var jn = Mn(
      function (e, t) {
        return !!Tn(e) && !!t.symbolRegistry.getIdentifier(e);
      },
      function (e, t) {
        return ["symbol", t.symbolRegistry.getIdentifier(e)];
      },
      function (e) {
        return e.description;
      },
      function (e, t, n) {
        var r = n.symbolRegistry.getValue(t[1]);
        if (!r) throw new Error("Trying to deserialize unknown symbol");
        return r;
      },
    ),
    qn = [
      Int8Array,
      Uint8Array,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      Uint8ClampedArray,
    ].reduce(function (e, t) {
      return (e[t.name] = t), e;
    }, {}),
    Fn = Mn(
      function (e) {
        return ArrayBuffer.isView(e) && !(e instanceof DataView);
      },
      function (e) {
        return ["typed-array", e.constructor.name];
      },
      function (e) {
        return Ln([], Rn(e));
      },
      function (e, t) {
        var n = qn[t[1]];
        if (!n) throw new Error("Trying to deserialize unknown typed array");
        return new n(e);
      },
    );
  function Un(e, t) {
    return (
      !!(null == e ? void 0 : e.constructor) &&
      !!t.classRegistry.getIdentifier(e.constructor)
    );
  }
  var Bn = Mn(
      Un,
      function (e, t) {
        return ["class", t.classRegistry.getIdentifier(e.constructor)];
      },
      function (e, t) {
        var n = t.classRegistry.getAllowedProps(e.constructor);
        if (!n) return An({}, e);
        var r = {};
        return (
          n.forEach(function (t) {
            r[t] = e[t];
          }),
          r
        );
      },
      function (e, t, n) {
        var r = n.classRegistry.getValue(t[1]);
        if (!r)
          throw new Error(
            "Trying to deserialize unknown class - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564",
          );
        return Object.assign(Object.create(r.prototype), e);
      },
    ),
    zn = Mn(
      function (e, t) {
        return !!t.customTransformerRegistry.findApplicable(e);
      },
      function (e, t) {
        return ["custom", t.customTransformerRegistry.findApplicable(e).name];
      },
      function (e, t) {
        return t.customTransformerRegistry.findApplicable(e).serialize(e);
      },
      function (e, t, n) {
        var r = n.customTransformerRegistry.findByName(t[1]);
        if (!r) throw new Error("Trying to deserialize unknown custom value");
        return r.deserialize(e);
      },
    ),
    $n = [Bn, jn, zn, Fn],
    Vn = function (e, t) {
      var n = wn($n, function (n) {
        return n.isApplicable(e, t);
      });
      if (n) return { value: n.transform(e, t), type: n.annotation(e, t) };
      var r = wn(Nn, function (n) {
        return n.isApplicable(e, t);
      });
      return r ? { value: r.transform(e, t), type: r.annotation } : void 0;
    },
    Kn = {};
  Nn.forEach(function (e) {
    Kn[e.annotation] = e;
  });
  var Hn = function (e, t) {
    for (var n = e.keys(); t > 0; ) n.next(), t--;
    return n.next().value;
  };
  function Wn(e) {
    if (yn(e, "__proto__"))
      throw new Error("__proto__ is not allowed as a property");
    if (yn(e, "prototype"))
      throw new Error("prototype is not allowed as a property");
    if (yn(e, "constructor"))
      throw new Error("constructor is not allowed as a property");
  }
  var Gn = function (e, t, n) {
      if ((Wn(t), 0 === t.length)) return n(e);
      for (var r = e, s = 0; s < t.length - 1; s++) {
        var i = t[s];
        if (In(r)) r = r[+i];
        else if (vn(r)) r = r[i];
        else if (xn(r)) r = Hn(r, (o = +i));
        else if (En(r)) {
          if (s === t.length - 2) break;
          var o = +i,
            a = 0 == +t[++s] ? "key" : "value",
            c = Hn(r, o);
          switch (a) {
            case "key":
              r = c;
              break;
            case "value":
              r = r.get(c);
          }
        }
      }
      var u = t[t.length - 1];
      if ((In(r) ? (r[+u] = n(r[+u])) : vn(r) && (r[u] = n(r[u])), xn(r))) {
        var l = Hn(r, +u),
          h = n(l);
        l !== h && (r.delete(l), r.add(h));
      }
      if (En(r)) {
        o = +t[t.length - 2];
        var d = Hn(r, o);
        switch ((a = 0 == +u ? "key" : "value")) {
          case "key":
            var p = n(d);
            r.set(p, r.get(d)), p !== d && r.delete(d);
            break;
          case "value":
            r.set(d, n(r.get(d)));
        }
      }
      return e;
    },
    Jn = function (e, t) {
      var n = "function" == typeof Symbol && e[Symbol.iterator];
      if (!n) return e;
      var r,
        s,
        i = n.call(e),
        o = [];
      try {
        for (; (void 0 === t || t-- > 0) && !(r = i.next()).done; )
          o.push(r.value);
      } catch (e) {
        s = { error: e };
      } finally {
        try {
          r && !r.done && (n = i.return) && n.call(i);
        } finally {
          if (s) throw s.error;
        }
      }
      return o;
    },
    Yn = function (e, t) {
      for (var n = 0, r = t.length, s = e.length; n < r; n++, s++) e[s] = t[n];
      return e;
    };
  function Qn(e, t, n) {
    if ((void 0 === n && (n = []), e))
      if (In(e)) {
        var r = Jn(e, 2),
          s = r[0],
          i = r[1];
        i &&
          mn(i, function (e, r) {
            Qn(e, t, Yn(Yn([], Jn(n)), Jn(Dn(r))));
          }),
          t(s, n);
      } else
        mn(e, function (e, r) {
          return Qn(e, t, Yn(Yn([], Jn(n)), Jn(Dn(r))));
        });
  }
  function Zn(e, t, n) {
    return (
      Qn(t, function (t, r) {
        e = Gn(e, r, function (e) {
          return (function (e, t, n) {
            if (!In(t)) {
              var r = Kn[t];
              if (!r) throw new Error("Unknown transformation: " + t);
              return r.untransform(e, n);
            }
            switch (t[0]) {
              case "symbol":
                return jn.untransform(e, t, n);
              case "class":
                return Bn.untransform(e, t, n);
              case "custom":
                return zn.untransform(e, t, n);
              case "typed-array":
                return Fn.untransform(e, t, n);
              default:
                throw new Error("Unknown transformation: " + t);
            }
          })(e, t, n);
        });
      }),
      e
    );
  }
  var Xn,
    er = function (e, t, n, r, s, i, o) {
      var a;
      void 0 === s && (s = []),
        void 0 === i && (i = []),
        void 0 === o && (o = new Map());
      var c,
        u =
          (function (e) {
            return "boolean" == typeof e;
          })((c = e)) ||
          (function (e) {
            return null === e;
          })(c) ||
          _n(c) ||
          (function (e) {
            return "number" == typeof e && !isNaN(e);
          })(c) ||
          (function (e) {
            return "string" == typeof e;
          })(c) ||
          Tn(c);
      if (!u) {
        !(function (e, t, n) {
          var r = n.get(e);
          r ? r.push(t) : n.set(e, [t]);
        })(e, s, t);
        var l = o.get(e);
        if (l) return r ? { transformedValue: null } : l;
      }
      if (
        !(function (e, t) {
          return vn(e) || In(e) || En(e) || xn(e) || Un(e, t);
        })(e, n)
      ) {
        var h = Vn(e, n),
          d = h
            ? { transformedValue: h.value, annotations: [h.type] }
            : { transformedValue: e };
        return u || o.set(e, d), d;
      }
      if (yn(i, e)) return { transformedValue: null };
      var p = Vn(e, n),
        f = null !== (a = null == p ? void 0 : p.value) && void 0 !== a ? a : e,
        g = In(f) ? [] : {},
        m = {};
      mn(f, function (a, c) {
        var u = er(
          a,
          t,
          n,
          r,
          Yn(Yn([], Jn(s)), [c]),
          Yn(Yn([], Jn(i)), [e]),
          o,
        );
        (g[c] = u.transformedValue),
          In(u.annotations)
            ? (m[c] = u.annotations)
            : vn(u.annotations) &&
              mn(u.annotations, function (e, t) {
                m[kn(c) + "." + t] = e;
              });
      });
      var y = Sn(m)
        ? { transformedValue: g, annotations: p ? [p.type] : void 0 }
        : { transformedValue: g, annotations: p ? [p.type, m] : m };
      return u || o.set(e, y), y;
    };
  function tr(e) {
    return Object.prototype.toString.call(e).slice(8, -1);
  }
  function nr(e) {
    return "Array" === tr(e);
  }
  function rr(e, t = {}) {
    return nr(e)
      ? e.map((e) => rr(e, t))
      : (function (e) {
            if ("Object" !== tr(e)) return !1;
            const t = Object.getPrototypeOf(e);
            return !!t && t.constructor === Object && t === Object.prototype;
          })(e)
        ? [
            ...Object.getOwnPropertyNames(e),
            ...Object.getOwnPropertySymbols(e),
          ].reduce(
            (n, r) => (
              (nr(t.props) && !t.props.includes(r)) ||
                (function (e, t, n, r, s) {
                  const i = {}.propertyIsEnumerable.call(r, t)
                    ? "enumerable"
                    : "nonenumerable";
                  "enumerable" === i && (e[t] = n),
                    s &&
                      "nonenumerable" === i &&
                      Object.defineProperty(e, t, {
                        value: n,
                        enumerable: !1,
                        writable: !0,
                        configurable: !0,
                      });
                })(n, r, rr(e[r], t), e, t.nonenumerable),
              n
            ),
            {},
          )
        : e;
  }
  var sr = function () {
      return (
        (sr =
          Object.assign ||
          function (e) {
            for (var t, n = 1, r = arguments.length; n < r; n++)
              for (var s in (t = arguments[n]))
                Object.prototype.hasOwnProperty.call(t, s) && (e[s] = t[s]);
            return e;
          }),
        sr.apply(this, arguments)
      );
    },
    ir = (function () {
      function e(e) {
        var t = (void 0 === e ? {} : e).dedupe,
          n = void 0 !== t && t;
        (this.classRegistry = new fn()),
          (this.symbolRegistry = new dn(function (e) {
            var t;
            return null !== (t = e.description) && void 0 !== t ? t : "";
          })),
          (this.customTransformerRegistry = new bn()),
          (this.allowedErrorProps = []),
          (this.dedupe = n);
      }
      return (
        (e.prototype.serialize = function (e) {
          var t = new Map(),
            n = er(e, t, this, this.dedupe),
            r = { json: n.transformedValue };
          n.annotations &&
            (r.meta = sr(sr({}, r.meta), { values: n.annotations }));
          var s,
            i,
            o,
            a,
            c =
              ((s = t),
              (i = this.dedupe),
              (o = {}),
              (a = void 0),
              s.forEach(function (e) {
                if (!(e.length <= 1)) {
                  i ||
                    (e = e
                      .map(function (e) {
                        return e.map(String);
                      })
                      .sort(function (e, t) {
                        return e.length - t.length;
                      }));
                  var t = Jn(e),
                    n = t[0],
                    r = t.slice(1);
                  0 === n.length ? (a = r.map(On)) : (o[On(n)] = r.map(On));
                }
              }),
              a ? (Sn(o) ? [a] : [a, o]) : Sn(o) ? void 0 : o);
          return (
            c && (r.meta = sr(sr({}, r.meta), { referentialEqualities: c })), r
          );
        }),
        (e.prototype.deserialize = function (e) {
          var t = e.json,
            n = e.meta,
            r = rr(t);
          return (
            (null == n ? void 0 : n.values) && (r = Zn(r, n.values, this)),
            (null == n ? void 0 : n.referentialEqualities) &&
              (r = (function (e, t) {
                function n(t, n) {
                  var r = (function (e, t) {
                    Wn(t);
                    for (var n = 0; n < t.length; n++) {
                      var r = t[n];
                      if (xn(e)) e = Hn(e, +r);
                      else if (En(e)) {
                        var s = +r,
                          i = 0 == +t[++n] ? "key" : "value",
                          o = Hn(e, s);
                        switch (i) {
                          case "key":
                            e = o;
                            break;
                          case "value":
                            e = e.get(o);
                        }
                      } else e = e[r];
                    }
                    return e;
                  })(e, Dn(n));
                  t.map(Dn).forEach(function (t) {
                    e = Gn(e, t, function () {
                      return r;
                    });
                  });
                }
                if (In(t)) {
                  var r = Jn(t, 2),
                    s = r[0],
                    i = r[1];
                  s.forEach(function (t) {
                    e = Gn(e, Dn(t), function () {
                      return e;
                    });
                  }),
                    i && mn(i, n);
                } else mn(t, n);
                return e;
              })(r, n.referentialEqualities)),
            r
          );
        }),
        (e.prototype.stringify = function (e) {
          return JSON.stringify(this.serialize(e));
        }),
        (e.prototype.parse = function (e) {
          return this.deserialize(JSON.parse(e));
        }),
        (e.prototype.registerClass = function (e, t) {
          this.classRegistry.register(e, t);
        }),
        (e.prototype.registerSymbol = function (e, t) {
          this.symbolRegistry.register(e, t);
        }),
        (e.prototype.registerCustom = function (e, t) {
          this.customTransformerRegistry.register(sr({ name: t }, e));
        }),
        (e.prototype.allowErrorProps = function () {
          for (var e, t = [], n = 0; n < arguments.length; n++)
            t[n] = arguments[n];
          (e = this.allowedErrorProps).push.apply(
            e,
            (function (e, t) {
              for (var n = 0, r = t.length, s = e.length; n < r; n++, s++)
                e[s] = t[n];
              return e;
            })(
              [],
              (function (e, t) {
                var n = "function" == typeof Symbol && e[Symbol.iterator];
                if (!n) return e;
                var r,
                  s,
                  i = n.call(e),
                  o = [];
                try {
                  for (; (void 0 === t || t-- > 0) && !(r = i.next()).done; )
                    o.push(r.value);
                } catch (e) {
                  s = { error: e };
                } finally {
                  try {
                    r && !r.done && (n = i.return) && n.call(i);
                  } finally {
                    if (s) throw s.error;
                  }
                }
                return o;
              })(t),
            ),
          );
        }),
        (e.defaultInstance = new e()),
        (e.serialize = e.defaultInstance.serialize.bind(e.defaultInstance)),
        (e.deserialize = e.defaultInstance.deserialize.bind(e.defaultInstance)),
        (e.stringify = e.defaultInstance.stringify.bind(e.defaultInstance)),
        (e.parse = e.defaultInstance.parse.bind(e.defaultInstance)),
        (e.registerClass = e.defaultInstance.registerClass.bind(
          e.defaultInstance,
        )),
        (e.registerSymbol = e.defaultInstance.registerSymbol.bind(
          e.defaultInstance,
        )),
        (e.registerCustom = e.defaultInstance.registerCustom.bind(
          e.defaultInstance,
        )),
        (e.allowErrorProps = e.defaultInstance.allowErrorProps.bind(
          e.defaultInstance,
        )),
        e
      );
    })();
  const or = ir;
  ir.serialize,
    ir.deserialize,
    ir.stringify,
    ir.parse,
    ir.registerClass,
    ir.registerCustom,
    ir.registerSymbol,
    ir.allowErrorProps;
  const ar = new (class {
      async getSession() {
        const e = await Ge(),
          t = await e.get(Ve.KV, Ke.Session);
        return t?.value || null;
      }
      async setSession(e) {
        const t = (await Ge()).transaction(Ve.KV, "readwrite"),
          n = t.objectStore(Ve.KV);
        await n.put({ key: Ke.Session, value: e }),
          await n.put({ key: Ke.LastSessionUserId, value: e.userId }),
          await t.done;
      }
      async removeSession() {
        const e = (await Ge()).transaction(Ve.KV, "readwrite"),
          t = e.objectStore(Ve.KV);
        await t.delete(Ke.Session), await e.done;
      }
      async getLastSessionUserId() {
        const e = await Ge(),
          t = await e.get(Ve.KV, Ke.LastSessionUserId);
        return t?.value || null;
      }
      async deleteAllData() {
        const e = await Ge();
        await e.clear(Ve.KV), await e.clear(Ve.Recipes);
      }
    })(),
    cr =
      ((hr = {
        links: [
          an({
            url:
              (() => {
                let e = self || window;
                return "beta.recipesage.com" === e.location.hostname
                  ? "https://api.beta.recipesage.com/"
                  : (e.location.protocol,
                    e.location.hostname,
                    e.API_BASE_OVERRIDE || "api/");
              })() + "trpc",
            headers: async () => {
              let e;
              try {
                e = localStorage.getItem("token") || void 0;
              } catch (t) {
                const n = await ar.getSession();
                e = n?.token;
              }
              return { Authorization: e ? `Bearer ${e}` : void 0 };
            },
          }),
        ],
        transformer: or,
      }),
      (lr = new (class {
        $request({ type: e, input: t, path: n, context: r = {} }) {
          return (function (e) {
            return Pt((t) =>
              (function t(n = 0, r = e.op) {
                const s = e.links[n];
                if (!s)
                  throw new Error(
                    "No more links to execute - did you forget to add an ending link?",
                  );
                return s({ op: r, next: (e) => t(n + 1, e) });
              })().subscribe(t),
            );
          })({
            links: this.links,
            op: {
              id: ++this.requestId,
              type: e,
              path: n,
              input: t,
              context: r,
            },
          }).pipe((e) => {
            let t = 0,
              n = null;
            const r = [];
            return {
              subscribe: (s) => (
                t++,
                r.push(s),
                n ||
                  (n = e.subscribe({
                    next(e) {
                      for (const t of r) t.next?.(e);
                    },
                    error(e) {
                      for (const t of r) t.error?.(e);
                    },
                    complete() {
                      for (const e of r) e.complete?.();
                    },
                  })),
                {
                  unsubscribe() {
                    t--,
                      (function () {
                        if (0 === t && n) {
                          const e = n;
                          (n = null), e.unsubscribe();
                        }
                      })();
                    const e = r.findIndex((e) => e === s);
                    e > -1 && r.splice(e, 1);
                  },
                }
              ),
            };
          });
        }
        requestAsPromise(e) {
          const t = this.$request(e),
            { promise: n, abort: r } = (function (e) {
              let t;
              return {
                promise: new Promise((n, r) => {
                  let s = !1;
                  function i() {
                    s ||
                      ((s = !0),
                      r(new Nt("This operation was aborted.")),
                      o.unsubscribe());
                  }
                  const o = e.subscribe({
                    next(e) {
                      (s = !0), n(e), i();
                    },
                    error(e) {
                      (s = !0), r(e), i();
                    },
                    complete() {
                      (s = !0), i();
                    },
                  });
                  t = i;
                }),
                abort: t,
              };
            })(t);
          return new Promise((t, s) => {
            e.signal?.addEventListener("abort", r),
              n
                .then((e) => {
                  t(e.result.data);
                })
                .catch((e) => {
                  s(Ht.from(e));
                });
          });
        }
        query(e, t, n) {
          return this.requestAsPromise({
            type: "query",
            path: e,
            input: t,
            context: n?.context,
            signal: n?.signal,
          });
        }
        mutation(e, t, n) {
          return this.requestAsPromise({
            type: "mutation",
            path: e,
            input: t,
            context: n?.context,
            signal: n?.signal,
          });
        }
        subscription(e, t, n) {
          return this.$request({
            type: "subscription",
            path: e,
            input: t,
            context: n?.context,
          }).subscribe({
            next(e) {
              "started" === e.result.type
                ? n.onStarted?.()
                : "stopped" === e.result.type
                  ? n.onStopped?.()
                  : n.onData?.(e.result.data);
            },
            error(e) {
              n.onError?.(e);
            },
            complete() {
              n.onComplete?.();
            },
          });
        }
        constructor(e) {
          this.requestId = 0;
          const t = (() => {
            const t = e.transformer;
            return t
              ? "input" in t
                ? e.transformer
                : { input: t, output: t }
              : {
                  input: { serialize: (e) => e, deserialize: (e) => e },
                  output: { serialize: (e) => e, deserialize: (e) => e },
                };
          })();
          (this.runtime = {
            transformer: {
              serialize: (e) => t.input.serialize(e),
              deserialize: (e) => t.output.deserialize(e),
            },
            combinedTransformer: t,
          }),
            (this.links = e.links.map((e) => e(this.runtime)));
        }
      })(hr)),
      (ur = (e) =>
        lr.hasOwnProperty(e)
          ? lr[e]
          : "__untypedClient" === e
            ? lr
            : Ut(({ path: t, args: n }) => {
                const r = [e, ...t],
                  s = ((o = r.pop()), cn[o]),
                  i = r.join(".");
                var o;
                return lr[s](i, ...n);
              })),
      new Proxy(qt, {
        get(e, t) {
          if ("string" == typeof t && "then" !== t) return ur(t);
        },
      }));
  var ur, lr, hr;
  const dr = (e) =>
      new Promise((t) => {
        setTimeout(t, e);
      }),
    pr = new BroadcastChannel("swBroadcastChannel"),
    fr = 250;
  class gr {
    constructor(e, t) {
      (this.localDb = e),
        (this.searchManager = t),
        (this.currentSyncPromise = null),
        pr.addEventListener("message", (e) => {
          "triggerFullSync" === e.data.type && this.syncAll(),
            "triggerRecipeSyncById" === e.data.type &&
              this.syncRecipe(e.data.recipeId);
        });
    }
    async syncAll() {
      return this.currentSyncPromise
        ? (console.log("Sync already in progress"), this.currentSyncPromise)
        : ((this.currentSyncPromise = this._syncAll().finally(() => {
            this.currentSyncPromise = null;
          })),
          this.currentSyncPromise);
    }
    async _syncAll() {
      const e = await ar.getSession();
      if (e) {
        performance.mark("startSync"),
          console.log(`Beginning sync for ${e.email}`),
          await this.searchManager.onReady();
        try {
          {
            const e = (
                await cr.recipes.getAllVisibleRecipesManifest.query()
              ).reduce((e, t) => e.add(t.id), new Set()),
              t = new Set(await this.localDb.getAllKeys(Ve.Recipes)),
              n = this.searchManager.getKnownIndexIds(),
              r = new Set();
            for (const t of e) n.has(t) || r.add(t);
            for (const t of n.keys())
              e.has(t) || (await this.searchManager.unindexRecipe(t));
            for (const n of t)
              e.has(n.toString()) ||
                (await this.localDb.delete(Ve.Recipes, n),
                await this.searchManager.unindexRecipe(n.toString()));
            const s = [...r];
            for (; s.length; ) {
              const e = s.splice(0, 50),
                t = await cr.recipes.getRecipesByIds.query({ ids: e });
              for (const e of t)
                await this.localDb.put(Ve.Recipes, e),
                  await this.searchManager.indexRecipe(e);
              await dr(fr);
            }
          }
          await dr(fr);
          {
            const e = await cr.labels.getAllVisibleLabels.query();
            await this.localDb.clear(Ve.Labels);
            for (const t of e) await this.localDb.put(Ve.Labels, t);
          }
          await dr(fr);
          {
            const e = await cr.labelGroups.getLabelGroups.query();
            await this.localDb.clear(Ve.LabelGroups);
            for (const t of e) await this.localDb.put(Ve.LabelGroups, t);
          }
          await dr(fr);
          {
            const e = await cr.shoppingLists.getShoppingListsWithItems.query();
            await this.localDb.clear(Ve.ShoppingLists);
            for (const t of e) await this.localDb.put(Ve.ShoppingLists, t);
          }
          await dr(fr);
          {
            const e = await cr.mealPlans.getMealPlansWithItems.query();
            await this.localDb.clear(Ve.MealPlans);
            for (const t of e) await this.localDb.put(Ve.MealPlans, t);
          }
          performance.mark("endSync");
          const e = performance.measure("syncTime", "startSync", "endSync");
          console.log(`Syncing completed in ${e.duration}ms`);
        } catch (e) {
          console.error("Sync failed", e);
        }
      } else console.log("Not logged in, will not perform sync.");
    }
    async syncRecipe(e) {
      const t = await cr.recipes.getRecipe.query({ id: e });
      await this.localDb.put(Ve.Recipes, t),
        await this.searchManager.indexRecipe(t);
    }
  }
  const mr = function (e) {
      const t = [];
      let n = 0;
      for (let r = 0; r < e.length; r++) {
        let s = e.charCodeAt(r);
        s < 128
          ? (t[n++] = s)
          : s < 2048
            ? ((t[n++] = (s >> 6) | 192), (t[n++] = (63 & s) | 128))
            : 55296 == (64512 & s) &&
                r + 1 < e.length &&
                56320 == (64512 & e.charCodeAt(r + 1))
              ? ((s = 65536 + ((1023 & s) << 10) + (1023 & e.charCodeAt(++r))),
                (t[n++] = (s >> 18) | 240),
                (t[n++] = ((s >> 12) & 63) | 128),
                (t[n++] = ((s >> 6) & 63) | 128),
                (t[n++] = (63 & s) | 128))
              : ((t[n++] = (s >> 12) | 224),
                (t[n++] = ((s >> 6) & 63) | 128),
                (t[n++] = (63 & s) | 128));
      }
      return t;
    },
    yr = {
      byteToCharMap_: null,
      charToByteMap_: null,
      byteToCharMapWebSafe_: null,
      charToByteMapWebSafe_: null,
      ENCODED_VALS_BASE:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      get ENCODED_VALS() {
        return this.ENCODED_VALS_BASE + "+/=";
      },
      get ENCODED_VALS_WEBSAFE() {
        return this.ENCODED_VALS_BASE + "-_.";
      },
      HAS_NATIVE_SUPPORT: "function" == typeof atob,
      encodeByteArray(e, t) {
        if (!Array.isArray(e))
          throw Error("encodeByteArray takes an array as a parameter");
        this.init_();
        const n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_,
          r = [];
        for (let t = 0; t < e.length; t += 3) {
          const s = e[t],
            i = t + 1 < e.length,
            o = i ? e[t + 1] : 0,
            a = t + 2 < e.length,
            c = a ? e[t + 2] : 0,
            u = s >> 2,
            l = ((3 & s) << 4) | (o >> 4);
          let h = ((15 & o) << 2) | (c >> 6),
            d = 63 & c;
          a || ((d = 64), i || (h = 64)), r.push(n[u], n[l], n[h], n[d]);
        }
        return r.join("");
      },
      encodeString(e, t) {
        return this.HAS_NATIVE_SUPPORT && !t
          ? btoa(e)
          : this.encodeByteArray(mr(e), t);
      },
      decodeString(e, t) {
        return this.HAS_NATIVE_SUPPORT && !t
          ? atob(e)
          : (function (e) {
              const t = [];
              let n = 0,
                r = 0;
              for (; n < e.length; ) {
                const s = e[n++];
                if (s < 128) t[r++] = String.fromCharCode(s);
                else if (s > 191 && s < 224) {
                  const i = e[n++];
                  t[r++] = String.fromCharCode(((31 & s) << 6) | (63 & i));
                } else if (s > 239 && s < 365) {
                  const i =
                    (((7 & s) << 18) |
                      ((63 & e[n++]) << 12) |
                      ((63 & e[n++]) << 6) |
                      (63 & e[n++])) -
                    65536;
                  (t[r++] = String.fromCharCode(55296 + (i >> 10))),
                    (t[r++] = String.fromCharCode(56320 + (1023 & i)));
                } else {
                  const i = e[n++],
                    o = e[n++];
                  t[r++] = String.fromCharCode(
                    ((15 & s) << 12) | ((63 & i) << 6) | (63 & o),
                  );
                }
              }
              return t.join("");
            })(this.decodeStringToByteArray(e, t));
      },
      decodeStringToByteArray(e, t) {
        this.init_();
        const n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_,
          r = [];
        for (let t = 0; t < e.length; ) {
          const s = n[e.charAt(t++)],
            i = t < e.length ? n[e.charAt(t)] : 0;
          ++t;
          const o = t < e.length ? n[e.charAt(t)] : 64;
          ++t;
          const a = t < e.length ? n[e.charAt(t)] : 64;
          if ((++t, null == s || null == i || null == o || null == a))
            throw new wr();
          const c = (s << 2) | (i >> 4);
          if ((r.push(c), 64 !== o)) {
            const e = ((i << 4) & 240) | (o >> 2);
            if ((r.push(e), 64 !== a)) {
              const e = ((o << 6) & 192) | a;
              r.push(e);
            }
          }
        }
        return r;
      },
      init_() {
        if (!this.byteToCharMap_) {
          (this.byteToCharMap_ = {}),
            (this.charToByteMap_ = {}),
            (this.byteToCharMapWebSafe_ = {}),
            (this.charToByteMapWebSafe_ = {});
          for (let e = 0; e < this.ENCODED_VALS.length; e++)
            (this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e)),
              (this.charToByteMap_[this.byteToCharMap_[e]] = e),
              (this.byteToCharMapWebSafe_[e] =
                this.ENCODED_VALS_WEBSAFE.charAt(e)),
              (this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e),
              e >= this.ENCODED_VALS_BASE.length &&
                ((this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e),
                (this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e));
        }
      },
    };
  class wr extends Error {
    constructor() {
      super(...arguments), (this.name = "DecodeBase64StringError");
    }
  }
  const br = function (e) {
      return (function (e) {
        const t = mr(e);
        return yr.encodeByteArray(t, !0);
      })(e).replace(/\./g, "");
    },
    _r = () => {
      try {
        return (
          (function () {
            if ("undefined" != typeof self) return self;
            if ("undefined" != typeof window) return window;
            if (void 0 !== n.g) return n.g;
            throw new Error("Unable to locate global object.");
          })().__FIREBASE_DEFAULTS__ ||
          (() => {
            if ("undefined" == typeof process || void 0 === process.env) return;
            const e = process.env.__FIREBASE_DEFAULTS__;
            return e ? JSON.parse(e) : void 0;
          })() ||
          (() => {
            if ("undefined" == typeof document) return;
            let e;
            try {
              e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
            } catch (e) {
              return;
            }
            const t =
              e &&
              (function (e) {
                try {
                  return yr.decodeString(e, !0);
                } catch (e) {
                  console.error("base64Decode failed: ", e);
                }
                return null;
              })(e[1]);
            return t && JSON.parse(t);
          })()
        );
      } catch (e) {
        return void console.info(
          `Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`,
        );
      }
    },
    vr = () => {
      var e;
      return null === (e = _r()) || void 0 === e ? void 0 : e.config;
    };
  class Sr {
    constructor() {
      (this.reject = () => {}),
        (this.resolve = () => {}),
        (this.promise = new Promise((e, t) => {
          (this.resolve = e), (this.reject = t);
        }));
    }
    wrapCallback(e) {
      return (t, n) => {
        t ? this.reject(t) : this.resolve(n),
          "function" == typeof e &&
            (this.promise.catch(() => {}), 1 === e.length ? e(t) : e(t, n));
      };
    }
  }
  class Ir extends Error {
    constructor(e, t, n) {
      super(t),
        (this.code = e),
        (this.customData = n),
        (this.name = "FirebaseError"),
        Object.setPrototypeOf(this, Ir.prototype),
        Error.captureStackTrace &&
          Error.captureStackTrace(this, Er.prototype.create);
    }
  }
  class Er {
    constructor(e, t, n) {
      (this.service = e), (this.serviceName = t), (this.errors = n);
    }
    create(e, ...t) {
      const n = t[0] || {},
        r = `${this.service}/${e}`,
        s = this.errors[e],
        i = s
          ? (function (e, t) {
              return e.replace(xr, (e, n) => {
                const r = t[n];
                return null != r ? String(r) : `<${n}?>`;
              });
            })(s, n)
          : "Error",
        o = `${this.serviceName}: ${i} (${r}).`;
      return new Ir(r, o, n);
    }
  }
  const xr = /\{\$([^}]+)}/g;
  function Tr(e, t) {
    if (e === t) return !0;
    const n = Object.keys(e),
      r = Object.keys(t);
    for (const s of n) {
      if (!r.includes(s)) return !1;
      const n = e[s],
        i = t[s];
      if (Cr(n) && Cr(i)) {
        if (!Tr(n, i)) return !1;
      } else if (n !== i) return !1;
    }
    for (const e of r) if (!n.includes(e)) return !1;
    return !0;
  }
  function Cr(e) {
    return null !== e && "object" == typeof e;
  }
  class kr {
    constructor(e, t, n) {
      (this.name = e),
        (this.instanceFactory = t),
        (this.type = n),
        (this.multipleInstances = !1),
        (this.serviceProps = {}),
        (this.instantiationMode = "LAZY"),
        (this.onInstanceCreated = null);
    }
    setInstantiationMode(e) {
      return (this.instantiationMode = e), this;
    }
    setMultipleInstances(e) {
      return (this.multipleInstances = e), this;
    }
    setServiceProps(e) {
      return (this.serviceProps = e), this;
    }
    setInstanceCreatedCallback(e) {
      return (this.onInstanceCreated = e), this;
    }
  }
  const Or = "[DEFAULT]";
  class Dr {
    constructor(e, t) {
      (this.name = e),
        (this.container = t),
        (this.component = null),
        (this.instances = new Map()),
        (this.instancesDeferred = new Map()),
        (this.instancesOptions = new Map()),
        (this.onInitCallbacks = new Map());
    }
    get(e) {
      const t = this.normalizeInstanceIdentifier(e);
      if (!this.instancesDeferred.has(t)) {
        const e = new Sr();
        if (
          (this.instancesDeferred.set(t, e),
          this.isInitialized(t) || this.shouldAutoInitialize())
        )
          try {
            const n = this.getOrInitializeService({ instanceIdentifier: t });
            n && e.resolve(n);
          } catch (e) {}
      }
      return this.instancesDeferred.get(t).promise;
    }
    getImmediate(e) {
      var t;
      const n = this.normalizeInstanceIdentifier(
          null == e ? void 0 : e.identifier,
        ),
        r = null !== (t = null == e ? void 0 : e.optional) && void 0 !== t && t;
      if (!this.isInitialized(n) && !this.shouldAutoInitialize()) {
        if (r) return null;
        throw Error(`Service ${this.name} is not available`);
      }
      try {
        return this.getOrInitializeService({ instanceIdentifier: n });
      } catch (e) {
        if (r) return null;
        throw e;
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(e) {
      if (e.name !== this.name)
        throw Error(
          `Mismatching Component ${e.name} for Provider ${this.name}.`,
        );
      if (this.component)
        throw Error(`Component for ${this.name} has already been provided`);
      if (((this.component = e), this.shouldAutoInitialize())) {
        if (
          (function (e) {
            return "EAGER" === e.instantiationMode;
          })(e)
        )
          try {
            this.getOrInitializeService({ instanceIdentifier: Or });
          } catch (e) {}
        for (const [e, t] of this.instancesDeferred.entries()) {
          const n = this.normalizeInstanceIdentifier(e);
          try {
            const e = this.getOrInitializeService({ instanceIdentifier: n });
            t.resolve(e);
          } catch (e) {}
        }
      }
    }
    clearInstance(e = Or) {
      this.instancesDeferred.delete(e),
        this.instancesOptions.delete(e),
        this.instances.delete(e);
    }
    async delete() {
      const e = Array.from(this.instances.values());
      await Promise.all([
        ...e.filter((e) => "INTERNAL" in e).map((e) => e.INTERNAL.delete()),
        ...e.filter((e) => "_delete" in e).map((e) => e._delete()),
      ]);
    }
    isComponentSet() {
      return null != this.component;
    }
    isInitialized(e = Or) {
      return this.instances.has(e);
    }
    getOptions(e = Or) {
      return this.instancesOptions.get(e) || {};
    }
    initialize(e = {}) {
      const { options: t = {} } = e,
        n = this.normalizeInstanceIdentifier(e.instanceIdentifier);
      if (this.isInitialized(n))
        throw Error(`${this.name}(${n}) has already been initialized`);
      if (!this.isComponentSet())
        throw Error(`Component ${this.name} has not been registered yet`);
      const r = this.getOrInitializeService({
        instanceIdentifier: n,
        options: t,
      });
      for (const [e, t] of this.instancesDeferred.entries())
        n === this.normalizeInstanceIdentifier(e) && t.resolve(r);
      return r;
    }
    onInit(e, t) {
      var n;
      const r = this.normalizeInstanceIdentifier(t),
        s =
          null !== (n = this.onInitCallbacks.get(r)) && void 0 !== n
            ? n
            : new Set();
      s.add(e), this.onInitCallbacks.set(r, s);
      const i = this.instances.get(r);
      return (
        i && e(i, r),
        () => {
          s.delete(e);
        }
      );
    }
    invokeOnInitCallbacks(e, t) {
      const n = this.onInitCallbacks.get(t);
      if (n)
        for (const r of n)
          try {
            r(e, t);
          } catch (e) {}
    }
    getOrInitializeService({ instanceIdentifier: e, options: t = {} }) {
      let n = this.instances.get(e);
      if (
        !n &&
        this.component &&
        ((n = this.component.instanceFactory(this.container, {
          instanceIdentifier: ((r = e), r === Or ? void 0 : r),
          options: t,
        })),
        this.instances.set(e, n),
        this.instancesOptions.set(e, t),
        this.invokeOnInitCallbacks(n, e),
        this.component.onInstanceCreated)
      )
        try {
          this.component.onInstanceCreated(this.container, e, n);
        } catch (e) {}
      var r;
      return n || null;
    }
    normalizeInstanceIdentifier(e = Or) {
      return this.component ? (this.component.multipleInstances ? e : Or) : e;
    }
    shouldAutoInitialize() {
      return (
        !!this.component && "EXPLICIT" !== this.component.instantiationMode
      );
    }
  }
  class Ar {
    constructor(e) {
      (this.name = e), (this.providers = new Map());
    }
    addComponent(e) {
      const t = this.getProvider(e.name);
      if (t.isComponentSet())
        throw new Error(
          `Component ${e.name} has already been registered with ${this.name}`,
        );
      t.setComponent(e);
    }
    addOrOverwriteComponent(e) {
      this.getProvider(e.name).isComponentSet() &&
        this.providers.delete(e.name),
        this.addComponent(e);
    }
    getProvider(e) {
      if (this.providers.has(e)) return this.providers.get(e);
      const t = new Dr(e, this);
      return this.providers.set(e, t), t;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  }
  const Rr = [];
  var Lr;
  !(function (e) {
    (e[(e.DEBUG = 0)] = "DEBUG"),
      (e[(e.VERBOSE = 1)] = "VERBOSE"),
      (e[(e.INFO = 2)] = "INFO"),
      (e[(e.WARN = 3)] = "WARN"),
      (e[(e.ERROR = 4)] = "ERROR"),
      (e[(e.SILENT = 5)] = "SILENT");
  })(Lr || (Lr = {}));
  const Pr = {
      debug: Lr.DEBUG,
      verbose: Lr.VERBOSE,
      info: Lr.INFO,
      warn: Lr.WARN,
      error: Lr.ERROR,
      silent: Lr.SILENT,
    },
    Nr = Lr.INFO,
    Mr = {
      [Lr.DEBUG]: "log",
      [Lr.VERBOSE]: "log",
      [Lr.INFO]: "info",
      [Lr.WARN]: "warn",
      [Lr.ERROR]: "error",
    },
    jr = (e, t, ...n) => {
      if (t < e.logLevel) return;
      const r = new Date().toISOString(),
        s = Mr[t];
      if (!s)
        throw new Error(
          `Attempted to log a message with an invalid logType (value: ${t})`,
        );
      console[s](`[${r}]  ${e.name}:`, ...n);
    };
  class qr {
    constructor(e) {
      this.container = e;
    }
    getPlatformInfoString() {
      return this.container
        .getProviders()
        .map((e) => {
          if (
            (function (e) {
              const t = e.getComponent();
              return "VERSION" === (null == t ? void 0 : t.type);
            })(e)
          ) {
            const t = e.getImmediate();
            return `${t.library}/${t.version}`;
          }
          return null;
        })
        .filter((e) => e)
        .join(" ");
    }
  }
  const Fr = "@firebase/app",
    Ur = "0.10.18",
    Br = new (class {
      constructor(e) {
        (this.name = e),
          (this._logLevel = Nr),
          (this._logHandler = jr),
          (this._userLogHandler = null),
          Rr.push(this);
      }
      get logLevel() {
        return this._logLevel;
      }
      set logLevel(e) {
        if (!(e in Lr))
          throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
        this._logLevel = e;
      }
      setLogLevel(e) {
        this._logLevel = "string" == typeof e ? Pr[e] : e;
      }
      get logHandler() {
        return this._logHandler;
      }
      set logHandler(e) {
        if ("function" != typeof e)
          throw new TypeError(
            "Value assigned to `logHandler` must be a function",
          );
        this._logHandler = e;
      }
      get userLogHandler() {
        return this._userLogHandler;
      }
      set userLogHandler(e) {
        this._userLogHandler = e;
      }
      debug(...e) {
        this._userLogHandler && this._userLogHandler(this, Lr.DEBUG, ...e),
          this._logHandler(this, Lr.DEBUG, ...e);
      }
      log(...e) {
        this._userLogHandler && this._userLogHandler(this, Lr.VERBOSE, ...e),
          this._logHandler(this, Lr.VERBOSE, ...e);
      }
      info(...e) {
        this._userLogHandler && this._userLogHandler(this, Lr.INFO, ...e),
          this._logHandler(this, Lr.INFO, ...e);
      }
      warn(...e) {
        this._userLogHandler && this._userLogHandler(this, Lr.WARN, ...e),
          this._logHandler(this, Lr.WARN, ...e);
      }
      error(...e) {
        this._userLogHandler && this._userLogHandler(this, Lr.ERROR, ...e),
          this._logHandler(this, Lr.ERROR, ...e);
      }
    })("@firebase/app"),
    zr = "@firebase/app-compat",
    $r = "@firebase/analytics-compat",
    Vr = "@firebase/analytics",
    Kr = "@firebase/app-check-compat",
    Hr = "@firebase/app-check",
    Wr = "@firebase/auth",
    Gr = "@firebase/auth-compat",
    Jr = "@firebase/database",
    Yr = "@firebase/data-connect",
    Qr = "@firebase/database-compat",
    Zr = "@firebase/functions",
    Xr = "@firebase/functions-compat",
    es = "@firebase/installations",
    ts = "@firebase/installations-compat",
    ns = "@firebase/messaging",
    rs = "@firebase/messaging-compat",
    ss = "@firebase/performance",
    is = "@firebase/performance-compat",
    os = "@firebase/remote-config",
    as = "@firebase/remote-config-compat",
    cs = "@firebase/storage",
    us = "@firebase/storage-compat",
    ls = "@firebase/firestore",
    hs = "@firebase/vertexai",
    ds = "@firebase/firestore-compat",
    ps = "firebase",
    fs = "[DEFAULT]",
    gs = {
      [Fr]: "fire-core",
      [zr]: "fire-core-compat",
      [Vr]: "fire-analytics",
      [$r]: "fire-analytics-compat",
      [Hr]: "fire-app-check",
      [Kr]: "fire-app-check-compat",
      [Wr]: "fire-auth",
      [Gr]: "fire-auth-compat",
      [Jr]: "fire-rtdb",
      [Yr]: "fire-data-connect",
      [Qr]: "fire-rtdb-compat",
      [Zr]: "fire-fn",
      [Xr]: "fire-fn-compat",
      [es]: "fire-iid",
      [ts]: "fire-iid-compat",
      [ns]: "fire-fcm",
      [rs]: "fire-fcm-compat",
      [ss]: "fire-perf",
      [is]: "fire-perf-compat",
      [os]: "fire-rc",
      [as]: "fire-rc-compat",
      [cs]: "fire-gcs",
      [us]: "fire-gcs-compat",
      [ls]: "fire-fst",
      [ds]: "fire-fst-compat",
      [hs]: "fire-vertex",
      "fire-js": "fire-js",
      [ps]: "fire-js-all",
    },
    ms = new Map(),
    ys = new Map(),
    ws = new Map();
  function bs(e, t) {
    try {
      e.container.addComponent(t);
    } catch (n) {
      Br.debug(
        `Component ${t.name} failed to register with FirebaseApp ${e.name}`,
        n,
      );
    }
  }
  function _s(e) {
    const t = e.name;
    if (ws.has(t))
      return (
        Br.debug(`There were multiple attempts to register component ${t}.`), !1
      );
    ws.set(t, e);
    for (const t of ms.values()) bs(t, e);
    for (const t of ys.values()) bs(t, e);
    return !0;
  }
  function vs(e, t) {
    const n = e.container
      .getProvider("heartbeat")
      .getImmediate({ optional: !0 });
    return n && n.triggerHeartbeat(), e.container.getProvider(t);
  }
  const Ss = new Er("app", "Firebase", {
    "no-app":
      "No Firebase App '{$appName}' has been created - call initializeApp() first",
    "bad-app-name": "Illegal App name: '{$appName}'",
    "duplicate-app":
      "Firebase App named '{$appName}' already exists with different options or config",
    "app-deleted": "Firebase App named '{$appName}' already deleted",
    "server-app-deleted": "Firebase Server App has been deleted",
    "no-options":
      "Need to provide options, when not being deployed to hosting via source.",
    "invalid-app-argument":
      "firebase.{$appName}() takes either no argument or a Firebase App instance.",
    "invalid-log-argument":
      "First argument to `onLog` must be null or a function.",
    "idb-open":
      "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
    "idb-get":
      "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
    "idb-set":
      "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
    "idb-delete":
      "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
    "finalization-registry-not-supported":
      "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
    "invalid-server-app-environment":
      "FirebaseServerApp is not for use in browser environments.",
  });
  class Is {
    constructor(e, t, n) {
      (this._isDeleted = !1),
        (this._options = Object.assign({}, e)),
        (this._config = Object.assign({}, t)),
        (this._name = t.name),
        (this._automaticDataCollectionEnabled =
          t.automaticDataCollectionEnabled),
        (this._container = n),
        this.container.addComponent(new kr("app", () => this, "PUBLIC"));
    }
    get automaticDataCollectionEnabled() {
      return this.checkDestroyed(), this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(e) {
      this.checkDestroyed(), (this._automaticDataCollectionEnabled = e);
    }
    get name() {
      return this.checkDestroyed(), this._name;
    }
    get options() {
      return this.checkDestroyed(), this._options;
    }
    get config() {
      return this.checkDestroyed(), this._config;
    }
    get container() {
      return this._container;
    }
    get isDeleted() {
      return this._isDeleted;
    }
    set isDeleted(e) {
      this._isDeleted = e;
    }
    checkDestroyed() {
      if (this.isDeleted)
        throw Ss.create("app-deleted", { appName: this._name });
    }
  }
  function Es(e, t = {}) {
    let n = e;
    "object" != typeof t && (t = { name: t });
    const r = Object.assign(
        { name: fs, automaticDataCollectionEnabled: !1 },
        t,
      ),
      s = r.name;
    if ("string" != typeof s || !s)
      throw Ss.create("bad-app-name", { appName: String(s) });
    if ((n || (n = vr()), !n)) throw Ss.create("no-options");
    const i = ms.get(s);
    if (i) {
      if (Tr(n, i.options) && Tr(r, i.config)) return i;
      throw Ss.create("duplicate-app", { appName: s });
    }
    const o = new Ar(s);
    for (const e of ws.values()) o.addComponent(e);
    const a = new Is(n, r, o);
    return ms.set(s, a), a;
  }
  function xs(e, t, n) {
    var r;
    let s = null !== (r = gs[e]) && void 0 !== r ? r : e;
    n && (s += `-${n}`);
    const i = s.match(/\s|\//),
      o = t.match(/\s|\//);
    if (i || o) {
      const e = [`Unable to register library "${s}" with version "${t}":`];
      return (
        i &&
          e.push(
            `library name "${s}" contains illegal characters (whitespace or "/")`,
          ),
        i && o && e.push("and"),
        o &&
          e.push(
            `version name "${t}" contains illegal characters (whitespace or "/")`,
          ),
        void Br.warn(e.join(" "))
      );
    }
    _s(new kr(`${s}-version`, () => ({ library: s, version: t }), "VERSION"));
  }
  const Ts = "firebase-heartbeat-database",
    Cs = 1,
    ks = "firebase-heartbeat-store";
  let Os = null;
  function Ds() {
    return (
      Os ||
        (Os = W(Ts, Cs, {
          upgrade: (e, t) => {
            if (0 === t)
              try {
                e.createObjectStore(ks);
              } catch (e) {
                console.warn(e);
              }
          },
        }).catch((e) => {
          throw Ss.create("idb-open", { originalErrorMessage: e.message });
        })),
      Os
    );
  }
  async function As(e, t) {
    try {
      const n = (await Ds()).transaction(ks, "readwrite"),
        r = n.objectStore(ks);
      await r.put(t, Rs(e)), await n.done;
    } catch (e) {
      if (e instanceof Ir) Br.warn(e.message);
      else {
        const t = Ss.create("idb-set", {
          originalErrorMessage: null == e ? void 0 : e.message,
        });
        Br.warn(t.message);
      }
    }
  }
  function Rs(e) {
    return `${e.name}!${e.options.appId}`;
  }
  class Ls {
    constructor(e) {
      (this.container = e), (this._heartbeatsCache = null);
      const t = this.container.getProvider("app").getImmediate();
      (this._storage = new Ns(t)),
        (this._heartbeatsCachePromise = this._storage
          .read()
          .then((e) => ((this._heartbeatsCache = e), e)));
    }
    async triggerHeartbeat() {
      var e, t;
      try {
        const n = this.container
            .getProvider("platform-logger")
            .getImmediate()
            .getPlatformInfoString(),
          r = Ps();
        if (
          null ==
            (null === (e = this._heartbeatsCache) || void 0 === e
              ? void 0
              : e.heartbeats) &&
          ((this._heartbeatsCache = await this._heartbeatsCachePromise),
          null ==
            (null === (t = this._heartbeatsCache) || void 0 === t
              ? void 0
              : t.heartbeats))
        )
          return;
        if (
          this._heartbeatsCache.lastSentHeartbeatDate === r ||
          this._heartbeatsCache.heartbeats.some((e) => e.date === r)
        )
          return;
        return (
          this._heartbeatsCache.heartbeats.push({ date: r, agent: n }),
          (this._heartbeatsCache.heartbeats =
            this._heartbeatsCache.heartbeats.filter((e) => {
              const t = new Date(e.date).valueOf();
              return Date.now() - t <= 2592e6;
            })),
          this._storage.overwrite(this._heartbeatsCache)
        );
      } catch (e) {
        Br.warn(e);
      }
    }
    async getHeartbeatsHeader() {
      var e;
      try {
        if (
          (null === this._heartbeatsCache &&
            (await this._heartbeatsCachePromise),
          null ==
            (null === (e = this._heartbeatsCache) || void 0 === e
              ? void 0
              : e.heartbeats) || 0 === this._heartbeatsCache.heartbeats.length)
        )
          return "";
        const t = Ps(),
          { heartbeatsToSend: n, unsentEntries: r } = (function (e, t = 1024) {
            const n = [];
            let r = e.slice();
            for (const s of e) {
              const e = n.find((e) => e.agent === s.agent);
              if (e) {
                if ((e.dates.push(s.date), Ms(n) > t)) {
                  e.dates.pop();
                  break;
                }
              } else if (
                (n.push({ agent: s.agent, dates: [s.date] }), Ms(n) > t)
              ) {
                n.pop();
                break;
              }
              r = r.slice(1);
            }
            return { heartbeatsToSend: n, unsentEntries: r };
          })(this._heartbeatsCache.heartbeats),
          s = br(JSON.stringify({ version: 2, heartbeats: n }));
        return (
          (this._heartbeatsCache.lastSentHeartbeatDate = t),
          r.length > 0
            ? ((this._heartbeatsCache.heartbeats = r),
              await this._storage.overwrite(this._heartbeatsCache))
            : ((this._heartbeatsCache.heartbeats = []),
              this._storage.overwrite(this._heartbeatsCache)),
          s
        );
      } catch (e) {
        return Br.warn(e), "";
      }
    }
  }
  function Ps() {
    return new Date().toISOString().substring(0, 10);
  }
  class Ns {
    constructor(e) {
      (this.app = e),
        (this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck());
    }
    async runIndexedDBEnvironmentCheck() {
      return (
        !!(function () {
          try {
            return "object" == typeof indexedDB;
          } catch (e) {
            return !1;
          }
        })() &&
        new Promise((e, t) => {
          try {
            let n = !0;
            const r = "validate-browser-context-for-indexeddb-analytics-module",
              s = self.indexedDB.open(r);
            (s.onsuccess = () => {
              s.result.close(), n || self.indexedDB.deleteDatabase(r), e(!0);
            }),
              (s.onupgradeneeded = () => {
                n = !1;
              }),
              (s.onerror = () => {
                var e;
                t(
                  (null === (e = s.error) || void 0 === e
                    ? void 0
                    : e.message) || "",
                );
              });
          } catch (e) {
            t(e);
          }
        })
          .then(() => !0)
          .catch(() => !1)
      );
    }
    async read() {
      if (await this._canUseIndexedDBPromise) {
        const e = await (async function (e) {
          try {
            const t = (await Ds()).transaction(ks),
              n = await t.objectStore(ks).get(Rs(e));
            return await t.done, n;
          } catch (e) {
            if (e instanceof Ir) Br.warn(e.message);
            else {
              const t = Ss.create("idb-get", {
                originalErrorMessage: null == e ? void 0 : e.message,
              });
              Br.warn(t.message);
            }
          }
        })(this.app);
        return (null == e ? void 0 : e.heartbeats) ? e : { heartbeats: [] };
      }
      return { heartbeats: [] };
    }
    async overwrite(e) {
      var t;
      if (await this._canUseIndexedDBPromise) {
        const n = await this.read();
        return As(this.app, {
          lastSentHeartbeatDate:
            null !== (t = e.lastSentHeartbeatDate) && void 0 !== t
              ? t
              : n.lastSentHeartbeatDate,
          heartbeats: e.heartbeats,
        });
      }
    }
    async add(e) {
      var t;
      if (await this._canUseIndexedDBPromise) {
        const n = await this.read();
        return As(this.app, {
          lastSentHeartbeatDate:
            null !== (t = e.lastSentHeartbeatDate) && void 0 !== t
              ? t
              : n.lastSentHeartbeatDate,
          heartbeats: [...n.heartbeats, ...e.heartbeats],
        });
      }
    }
  }
  function Ms(e) {
    return br(JSON.stringify({ version: 2, heartbeats: e })).length;
  }
  _s(new kr("platform-logger", (e) => new qr(e), "PRIVATE")),
    _s(new kr("heartbeat", (e) => new Ls(e), "PRIVATE")),
    xs(Fr, Ur, ""),
    xs(Fr, Ur, "esm2017"),
    xs("fire-js", ""),
    xs("firebase", "11.2.0", "app");
  Error;
  class js extends Error {
    constructor(e, t, n) {
      super(t),
        (this.code = e),
        (this.customData = n),
        (this.name = "FirebaseError"),
        Object.setPrototypeOf(this, js.prototype),
        Error.captureStackTrace &&
          Error.captureStackTrace(this, qs.prototype.create);
    }
  }
  class qs {
    constructor(e, t, n) {
      (this.service = e), (this.serviceName = t), (this.errors = n);
    }
    create(e, ...t) {
      const n = t[0] || {},
        r = `${this.service}/${e}`,
        s = this.errors[e],
        i = s
          ? (function (e, t) {
              return e.replace(Fs, (e, n) => {
                const r = t[n];
                return null != r ? String(r) : `<${n}?>`;
              });
            })(s, n)
          : "Error",
        o = `${this.serviceName}: ${i} (${r}).`;
      return new js(r, o, n);
    }
  }
  const Fs = /\{\$([^}]+)}/g;
  class Us {
    constructor(e, t, n) {
      (this.name = e),
        (this.instanceFactory = t),
        (this.type = n),
        (this.multipleInstances = !1),
        (this.serviceProps = {}),
        (this.instantiationMode = "LAZY"),
        (this.onInstanceCreated = null);
    }
    setInstantiationMode(e) {
      return (this.instantiationMode = e), this;
    }
    setMultipleInstances(e) {
      return (this.multipleInstances = e), this;
    }
    setServiceProps(e) {
      return (this.serviceProps = e), this;
    }
    setInstanceCreatedCallback(e) {
      return (this.onInstanceCreated = e), this;
    }
  }
  const Bs = "@firebase/installations",
    zs = "0.6.12",
    $s = 1e4,
    Vs = `w:${zs}`,
    Ks = "FIS_v2",
    Hs = "https://firebaseinstallations.googleapis.com/v1",
    Ws = 36e5,
    Gs = new qs("installations", "Installations", {
      "missing-app-config-values":
        'Missing App configuration value: "{$valueName}"',
      "not-registered": "Firebase Installation is not registered.",
      "installation-not-found": "Firebase Installation not found.",
      "request-failed":
        '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
      "app-offline": "Could not process request. Application offline.",
      "delete-pending-registration":
        "Can't delete installation while there is a pending registration request.",
    });
  function Js(e) {
    return e instanceof js && e.code.includes("request-failed");
  }
  function Ys({ projectId: e }) {
    return `${Hs}/projects/${e}/installations`;
  }
  function Qs(e) {
    return {
      token: e.token,
      requestStatus: 2,
      expiresIn: ((t = e.expiresIn), Number(t.replace("s", "000"))),
      creationTime: Date.now(),
    };
    var t;
  }
  async function Zs(e, t) {
    const n = (await t.json()).error;
    return Gs.create("request-failed", {
      requestName: e,
      serverCode: n.code,
      serverMessage: n.message,
      serverStatus: n.status,
    });
  }
  function Xs({ apiKey: e }) {
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": e,
    });
  }
  async function ei(e) {
    const t = await e();
    return t.status >= 500 && t.status < 600 ? e() : t;
  }
  function ti(e) {
    return new Promise((t) => {
      setTimeout(t, e);
    });
  }
  const ni = /^[cdef][\w-]{21}$/,
    ri = "";
  function si() {
    try {
      const e = new Uint8Array(17);
      (self.crypto || self.msCrypto).getRandomValues(e),
        (e[0] = 112 + (e[0] % 16));
      const t = (function (e) {
        var t;
        return ((t = e),
        btoa(String.fromCharCode(...t))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")).substr(0, 22);
      })(e);
      return ni.test(t) ? t : ri;
    } catch (e) {
      return ri;
    }
  }
  function ii(e) {
    return `${e.appName}!${e.appId}`;
  }
  const oi = new Map();
  function ai(e, t) {
    const n = ii(e);
    ci(n, t),
      (function (e, t) {
        const n =
          (!ui &&
            "BroadcastChannel" in self &&
            ((ui = new BroadcastChannel("[Firebase] FID Change")),
            (ui.onmessage = (e) => {
              ci(e.data.key, e.data.fid);
            })),
          ui);
        n && n.postMessage({ key: e, fid: t }),
          0 === oi.size && ui && (ui.close(), (ui = null));
      })(n, t);
  }
  function ci(e, t) {
    const n = oi.get(e);
    if (n) for (const e of n) e(t);
  }
  let ui = null;
  const li = "firebase-installations-database",
    hi = 1,
    di = "firebase-installations-store";
  let pi = null;
  function fi() {
    return (
      pi ||
        (pi = W(li, hi, {
          upgrade: (e, t) => {
            0 === t && e.createObjectStore(di);
          },
        })),
      pi
    );
  }
  async function gi(e, t) {
    const n = ii(e),
      r = (await fi()).transaction(di, "readwrite"),
      s = r.objectStore(di),
      i = await s.get(n);
    return (
      await s.put(t, n), await r.done, (i && i.fid === t.fid) || ai(e, t.fid), t
    );
  }
  async function mi(e) {
    const t = ii(e),
      n = (await fi()).transaction(di, "readwrite");
    await n.objectStore(di).delete(t), await n.done;
  }
  async function yi(e, t) {
    const n = ii(e),
      r = (await fi()).transaction(di, "readwrite"),
      s = r.objectStore(di),
      i = await s.get(n),
      o = t(i);
    return (
      void 0 === o ? await s.delete(n) : await s.put(o, n),
      await r.done,
      !o || (i && i.fid === o.fid) || ai(e, o.fid),
      o
    );
  }
  async function wi(e) {
    let t;
    const n = await yi(e.appConfig, (n) => {
      const r = (function (e) {
          return vi(e || { fid: si(), registrationStatus: 0 });
        })(n),
        s = (function (e, t) {
          if (0 === t.registrationStatus) {
            if (!navigator.onLine)
              return {
                installationEntry: t,
                registrationPromise: Promise.reject(Gs.create("app-offline")),
              };
            const n = {
                fid: t.fid,
                registrationStatus: 1,
                registrationTime: Date.now(),
              },
              r = (async function (e, t) {
                try {
                  const n = await (async function (
                    { appConfig: e, heartbeatServiceProvider: t },
                    { fid: n },
                  ) {
                    const r = Ys(e),
                      s = Xs(e),
                      i = t.getImmediate({ optional: !0 });
                    if (i) {
                      const e = await i.getHeartbeatsHeader();
                      e && s.append("x-firebase-client", e);
                    }
                    const o = {
                        fid: n,
                        authVersion: Ks,
                        appId: e.appId,
                        sdkVersion: Vs,
                      },
                      a = {
                        method: "POST",
                        headers: s,
                        body: JSON.stringify(o),
                      },
                      c = await ei(() => fetch(r, a));
                    if (c.ok) {
                      const e = await c.json();
                      return {
                        fid: e.fid || n,
                        registrationStatus: 2,
                        refreshToken: e.refreshToken,
                        authToken: Qs(e.authToken),
                      };
                    }
                    throw await Zs("Create Installation", c);
                  })(e, t);
                  return gi(e.appConfig, n);
                } catch (n) {
                  throw (
                    (Js(n) && 409 === n.customData.serverCode
                      ? await mi(e.appConfig)
                      : await gi(e.appConfig, {
                          fid: t.fid,
                          registrationStatus: 0,
                        }),
                    n)
                  );
                }
              })(e, n);
            return { installationEntry: n, registrationPromise: r };
          }
          return 1 === t.registrationStatus
            ? { installationEntry: t, registrationPromise: bi(e) }
            : { installationEntry: t };
        })(e, r);
      return (t = s.registrationPromise), s.installationEntry;
    });
    return n.fid === ri
      ? { installationEntry: await t }
      : { installationEntry: n, registrationPromise: t };
  }
  async function bi(e) {
    let t = await _i(e.appConfig);
    for (; 1 === t.registrationStatus; )
      await ti(100), (t = await _i(e.appConfig));
    if (0 === t.registrationStatus) {
      const { installationEntry: t, registrationPromise: n } = await wi(e);
      return n || t;
    }
    return t;
  }
  function _i(e) {
    return yi(e, (e) => {
      if (!e) throw Gs.create("installation-not-found");
      return vi(e);
    });
  }
  function vi(e) {
    return 1 === (t = e).registrationStatus &&
      t.registrationTime + $s < Date.now()
      ? { fid: e.fid, registrationStatus: 0 }
      : e;
    var t;
  }
  async function Si({ appConfig: e, heartbeatServiceProvider: t }, n) {
    const r = (function (e, { fid: t }) {
        return `${Ys(e)}/${t}/authTokens:generate`;
      })(e, n),
      s = (function (e, { refreshToken: t }) {
        const n = Xs(e);
        return (
          n.append(
            "Authorization",
            (function (e) {
              return `${Ks} ${e}`;
            })(t),
          ),
          n
        );
      })(e, n),
      i = t.getImmediate({ optional: !0 });
    if (i) {
      const e = await i.getHeartbeatsHeader();
      e && s.append("x-firebase-client", e);
    }
    const o = { installation: { sdkVersion: Vs, appId: e.appId } },
      a = { method: "POST", headers: s, body: JSON.stringify(o) },
      c = await ei(() => fetch(r, a));
    if (c.ok) return Qs(await c.json());
    throw await Zs("Generate Auth Token", c);
  }
  async function Ii(e, t = !1) {
    let n;
    const r = await yi(e.appConfig, (r) => {
      if (!xi(r)) throw Gs.create("not-registered");
      const s = r.authToken;
      if (
        !t &&
        2 === (i = s).requestStatus &&
        !(function (e) {
          const t = Date.now();
          return t < e.creationTime || e.creationTime + e.expiresIn < t + Ws;
        })(i)
      )
        return r;
      var i;
      if (1 === s.requestStatus)
        return (
          (n = (async function (e, t) {
            let n = await Ei(e.appConfig);
            for (; 1 === n.authToken.requestStatus; )
              await ti(100), (n = await Ei(e.appConfig));
            const r = n.authToken;
            return 0 === r.requestStatus ? Ii(e, t) : r;
          })(e, t)),
          r
        );
      {
        if (!navigator.onLine) throw Gs.create("app-offline");
        const t = (function (e) {
          const t = { requestStatus: 1, requestTime: Date.now() };
          return Object.assign(Object.assign({}, e), { authToken: t });
        })(r);
        return (
          (n = (async function (e, t) {
            try {
              const n = await Si(e, t),
                r = Object.assign(Object.assign({}, t), { authToken: n });
              return await gi(e.appConfig, r), n;
            } catch (n) {
              if (
                !Js(n) ||
                (401 !== n.customData.serverCode &&
                  404 !== n.customData.serverCode)
              ) {
                const n = Object.assign(Object.assign({}, t), {
                  authToken: { requestStatus: 0 },
                });
                await gi(e.appConfig, n);
              } else await mi(e.appConfig);
              throw n;
            }
          })(e, t)),
          t
        );
      }
    });
    return n ? await n : r.authToken;
  }
  function Ei(e) {
    return yi(e, (e) => {
      if (!xi(e)) throw Gs.create("not-registered");
      return 1 === (t = e.authToken).requestStatus &&
        t.requestTime + $s < Date.now()
        ? Object.assign(Object.assign({}, e), {
            authToken: { requestStatus: 0 },
          })
        : e;
      var t;
    });
  }
  function xi(e) {
    return void 0 !== e && 2 === e.registrationStatus;
  }
  function Ti(e) {
    return Gs.create("missing-app-config-values", { valueName: e });
  }
  const Ci = "installations";
  _s(
    new Us(
      Ci,
      (e) => {
        const t = e.getProvider("app").getImmediate(),
          n = (function (e) {
            if (!e || !e.options) throw Ti("App Configuration");
            if (!e.name) throw Ti("App Name");
            const t = ["projectId", "apiKey", "appId"];
            for (const n of t) if (!e.options[n]) throw Ti(n);
            return {
              appName: e.name,
              projectId: e.options.projectId,
              apiKey: e.options.apiKey,
              appId: e.options.appId,
            };
          })(t);
        return {
          app: t,
          appConfig: n,
          heartbeatServiceProvider: vs(t, "heartbeat"),
          _delete: () => Promise.resolve(),
        };
      },
      "PUBLIC",
    ),
  ),
    _s(
      new Us(
        "installations-internal",
        (e) => {
          const t = vs(e.getProvider("app").getImmediate(), Ci).getImmediate();
          return {
            getId: () =>
              (async function (e) {
                const t = e,
                  { installationEntry: n, registrationPromise: r } =
                    await wi(t);
                return (
                  r ? r.catch(console.error) : Ii(t).catch(console.error), n.fid
                );
              })(t),
            getToken: (e) =>
              (async function (e, t = !1) {
                const n = e;
                return (
                  await (async function (e) {
                    const { registrationPromise: t } = await wi(e);
                    t && (await t);
                  })(n),
                  (await Ii(n, t)).token
                );
              })(t, e),
          };
        },
        "PRIVATE",
      ),
    ),
    xs(Bs, zs),
    xs(Bs, zs, "esm2017");
  Error;
  class ki extends Error {
    constructor(e, t, n) {
      super(t),
        (this.code = e),
        (this.customData = n),
        (this.name = "FirebaseError"),
        Object.setPrototypeOf(this, ki.prototype),
        Error.captureStackTrace &&
          Error.captureStackTrace(this, Oi.prototype.create);
    }
  }
  class Oi {
    constructor(e, t, n) {
      (this.service = e), (this.serviceName = t), (this.errors = n);
    }
    create(e, ...t) {
      const n = t[0] || {},
        r = `${this.service}/${e}`,
        s = this.errors[e],
        i = s
          ? (function (e, t) {
              return e.replace(Di, (e, n) => {
                const r = t[n];
                return null != r ? String(r) : `<${n}?>`;
              });
            })(s, n)
          : "Error",
        o = `${this.serviceName}: ${i} (${r}).`;
      return new ki(r, o, n);
    }
  }
  const Di = /\{\$([^}]+)}/g;
  function Ai(e) {
    return e && e._delegate ? e._delegate : e;
  }
  const Ri =
      "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",
    Li = "https://fcmregistrations.googleapis.com/v1",
    Pi = "FCM_MSG",
    Ni = 3,
    Mi = 1;
  var ji, qi;
  function Fi(e) {
    const t = new Uint8Array(e);
    return btoa(String.fromCharCode(...t))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  function Ui(e) {
    const t = (e + "=".repeat((4 - (e.length % 4)) % 4))
        .replace(/\-/g, "+")
        .replace(/_/g, "/"),
      n = atob(t),
      r = new Uint8Array(n.length);
    for (let e = 0; e < n.length; ++e) r[e] = n.charCodeAt(e);
    return r;
  }
  !(function (e) {
    (e[(e.DATA_MESSAGE = 1)] = "DATA_MESSAGE"),
      (e[(e.DISPLAY_NOTIFICATION = 3)] = "DISPLAY_NOTIFICATION");
  })(ji || (ji = {})),
    (function (e) {
      (e.PUSH_RECEIVED = "push-received"),
        (e.NOTIFICATION_CLICKED = "notification-clicked");
    })(qi || (qi = {}));
  const Bi = "fcm_token_details_db",
    zi = 5,
    $i = "fcm_token_object_Store",
    Vi = "firebase-messaging-database",
    Ki = 1,
    Hi = "firebase-messaging-store";
  let Wi = null;
  function Gi() {
    return (
      Wi ||
        (Wi = W(Vi, Ki, {
          upgrade: (e, t) => {
            0 === t && e.createObjectStore(Hi);
          },
        })),
      Wi
    );
  }
  async function Ji(e) {
    const t = Qi(e),
      n = await Gi(),
      r = await n.transaction(Hi).objectStore(Hi).get(t);
    if (r) return r;
    {
      const t = await (async function (e) {
        if ("databases" in indexedDB) {
          const e = (await indexedDB.databases()).map((e) => e.name);
          if (!e.includes(Bi)) return null;
        }
        let t = null;
        return (
          (
            await W(Bi, zi, {
              upgrade: async (n, r, s, i) => {
                var o;
                if (r < 2) return;
                if (!n.objectStoreNames.contains($i)) return;
                const a = i.objectStore($i),
                  c = await a.index("fcmSenderId").get(e);
                if ((await a.clear(), c))
                  if (2 === r) {
                    const e = c;
                    if (!e.auth || !e.p256dh || !e.endpoint) return;
                    t = {
                      token: e.fcmToken,
                      createTime:
                        null !== (o = e.createTime) && void 0 !== o
                          ? o
                          : Date.now(),
                      subscriptionOptions: {
                        auth: e.auth,
                        p256dh: e.p256dh,
                        endpoint: e.endpoint,
                        swScope: e.swScope,
                        vapidKey:
                          "string" == typeof e.vapidKey
                            ? e.vapidKey
                            : Fi(e.vapidKey),
                      },
                    };
                  } else if (3 === r) {
                    const e = c;
                    t = {
                      token: e.fcmToken,
                      createTime: e.createTime,
                      subscriptionOptions: {
                        auth: Fi(e.auth),
                        p256dh: Fi(e.p256dh),
                        endpoint: e.endpoint,
                        swScope: e.swScope,
                        vapidKey: Fi(e.vapidKey),
                      },
                    };
                  } else if (4 === r) {
                    const e = c;
                    t = {
                      token: e.fcmToken,
                      createTime: e.createTime,
                      subscriptionOptions: {
                        auth: Fi(e.auth),
                        p256dh: Fi(e.p256dh),
                        endpoint: e.endpoint,
                        swScope: e.swScope,
                        vapidKey: Fi(e.vapidKey),
                      },
                    };
                  }
              },
            })
          ).close(),
          await G(Bi),
          await G("fcm_vapid_details_db"),
          await G("undefined"),
          (function (e) {
            if (!e || !e.subscriptionOptions) return !1;
            const { subscriptionOptions: t } = e;
            return (
              "number" == typeof e.createTime &&
              e.createTime > 0 &&
              "string" == typeof e.token &&
              e.token.length > 0 &&
              "string" == typeof t.auth &&
              t.auth.length > 0 &&
              "string" == typeof t.p256dh &&
              t.p256dh.length > 0 &&
              "string" == typeof t.endpoint &&
              t.endpoint.length > 0 &&
              "string" == typeof t.swScope &&
              t.swScope.length > 0 &&
              "string" == typeof t.vapidKey &&
              t.vapidKey.length > 0
            );
          })(t)
            ? t
            : null
        );
      })(e.appConfig.senderId);
      if (t) return await Yi(e, t), t;
    }
  }
  async function Yi(e, t) {
    const n = Qi(e),
      r = (await Gi()).transaction(Hi, "readwrite");
    return await r.objectStore(Hi).put(t, n), await r.done, t;
  }
  function Qi({ appConfig: e }) {
    return e.appId;
  }
  const Zi = new Oi("messaging", "Messaging", {
    "missing-app-config-values":
      'Missing App configuration value: "{$valueName}"',
    "only-available-in-window": "This method is available in a Window context.",
    "only-available-in-sw":
      "This method is available in a service worker context.",
    "permission-default":
      "The notification permission was not granted and dismissed instead.",
    "permission-blocked":
      "The notification permission was not granted and blocked instead.",
    "unsupported-browser":
      "This browser doesn't support the API's required to use the Firebase SDK.",
    "indexed-db-unsupported":
      "This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)",
    "failed-service-worker-registration":
      "We are unable to register the default service worker. {$browserErrorMessage}",
    "token-subscribe-failed":
      "A problem occurred while subscribing the user to FCM: {$errorInfo}",
    "token-subscribe-no-token":
      "FCM returned no token when subscribing the user to push.",
    "token-unsubscribe-failed":
      "A problem occurred while unsubscribing the user from FCM: {$errorInfo}",
    "token-update-failed":
      "A problem occurred while updating the user from FCM: {$errorInfo}",
    "token-update-no-token":
      "FCM returned no token when updating the user to push.",
    "use-sw-after-get-token":
      "The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.",
    "invalid-sw-registration":
      "The input to useServiceWorker() must be a ServiceWorkerRegistration.",
    "invalid-bg-handler":
      "The input to setBackgroundMessageHandler() must be a function.",
    "invalid-vapid-key": "The public VAPID key must be a string.",
    "use-vapid-key-after-get-token":
      "The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used.",
  });
  async function Xi(e, t) {
    const n = { method: "DELETE", headers: await to(e) };
    try {
      const r = await fetch(`${eo(e.appConfig)}/${t}`, n),
        s = await r.json();
      if (s.error) {
        const e = s.error.message;
        throw Zi.create("token-unsubscribe-failed", { errorInfo: e });
      }
    } catch (e) {
      throw Zi.create("token-unsubscribe-failed", {
        errorInfo: null == e ? void 0 : e.toString(),
      });
    }
  }
  function eo({ projectId: e }) {
    return `${Li}/projects/${e}/registrations`;
  }
  async function to({ appConfig: e, installations: t }) {
    const n = await t.getToken();
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": e.apiKey,
      "x-goog-firebase-installations-auth": `FIS ${n}`,
    });
  }
  function no({ p256dh: e, auth: t, endpoint: n, vapidKey: r }) {
    const s = { web: { endpoint: n, auth: t, p256dh: e } };
    return r !== Ri && (s.web.applicationPubKey = r), s;
  }
  async function ro(e) {
    const t = await Ji(e.firebaseDependencies);
    t &&
      (await Xi(e.firebaseDependencies, t.token),
      await (async function (e) {
        const t = Qi(e),
          n = (await Gi()).transaction(Hi, "readwrite");
        await n.objectStore(Hi).delete(t), await n.done;
      })(e.firebaseDependencies));
    const n = await e.swRegistration.pushManager.getSubscription();
    return !n || n.unsubscribe();
  }
  async function so(e, t) {
    const n = await (async function (e, t) {
        const n = await to(e),
          r = no(t),
          s = { method: "POST", headers: n, body: JSON.stringify(r) };
        let i;
        try {
          const t = await fetch(eo(e.appConfig), s);
          i = await t.json();
        } catch (e) {
          throw Zi.create("token-subscribe-failed", {
            errorInfo: null == e ? void 0 : e.toString(),
          });
        }
        if (i.error) {
          const e = i.error.message;
          throw Zi.create("token-subscribe-failed", { errorInfo: e });
        }
        if (!i.token) throw Zi.create("token-subscribe-no-token");
        return i.token;
      })(e, t),
      r = { token: n, createTime: Date.now(), subscriptionOptions: t };
    return await Yi(e, r), r.token;
  }
  async function io(e, t) {
    const n = (function ({ data: e }) {
      if (!e) return null;
      try {
        return e.json();
      } catch (e) {
        return null;
      }
    })(e);
    if (!n) return;
    t.deliveryMetricsExportedToBigQueryEnabled &&
      (await (async function (e, t) {
        const n = (function (e, t) {
          var n, r;
          const s = {};
          return (
            e.from && (s.project_number = e.from),
            e.fcmMessageId && (s.message_id = e.fcmMessageId),
            (s.instance_id = t),
            e.notification
              ? (s.message_type = ji.DISPLAY_NOTIFICATION.toString())
              : (s.message_type = ji.DATA_MESSAGE.toString()),
            (s.sdk_platform = Ni.toString()),
            (s.package_name = self.origin.replace(/(^\w+:|^)\/\//, "")),
            !e.collapse_key || (s.collapse_key = e.collapse_key),
            (s.event = Mi.toString()),
            !(null === (n = e.fcmOptions) || void 0 === n
              ? void 0
              : n.analytics_label) ||
              (s.analytics_label =
                null === (r = e.fcmOptions) || void 0 === r
                  ? void 0
                  : r.analytics_label),
            s
          );
        })(t, await e.firebaseDependencies.installations.getId());
        !(function (e, t, n) {
          const r = {};
          (r.event_time_ms = Math.floor(Date.now()).toString()),
            (r.source_extension_json_proto3 = JSON.stringify({
              messaging_client_event: t,
            })),
            !n ||
              (r.compliance_data = (function (e) {
                return {
                  privacy_context: {
                    prequest: { origin_associated_product_id: e },
                  },
                };
              })(n)),
            e.logEvents.push(r);
        })(e, n, t.productId);
      })(t, n));
    const r = await oo();
    if (
      (function (e) {
        return e.some(
          (e) =>
            "visible" === e.visibilityState &&
            !e.url.startsWith("chrome-extension://"),
        );
      })(r)
    )
      return (function (e, t) {
        (t.isFirebaseMessaging = !0), (t.messageType = qi.PUSH_RECEIVED);
        for (const n of e) n.postMessage(t);
      })(r, n);
    if (
      (n.notification &&
        (await (function (e) {
          var t;
          const { actions: n } = e,
            { maxActions: r } = Notification;
          return (
            n &&
              r &&
              n.length > r &&
              console.warn(
                `This browser only supports ${r} actions. The remaining actions will not be displayed.`,
              ),
            self.registration.showNotification(
              null !== (t = e.title) && void 0 !== t ? t : "",
              e,
            )
          );
        })(
          (function (e) {
            const t = Object.assign({}, e.notification);
            return (t.data = { [Pi]: e }), t;
          })(n),
        )),
      t && t.onBackgroundMessageHandler)
    ) {
      const e = (function (e) {
        const t = {
          from: e.from,
          collapseKey: e.collapse_key,
          messageId: e.fcmMessageId,
        };
        return (
          (function (e, t) {
            if (!t.notification) return;
            e.notification = {};
            const n = t.notification.title;
            n && (e.notification.title = n);
            const r = t.notification.body;
            r && (e.notification.body = r);
            const s = t.notification.image;
            s && (e.notification.image = s);
            const i = t.notification.icon;
            i && (e.notification.icon = i);
          })(t, e),
          (function (e, t) {
            t.data && (e.data = t.data);
          })(t, e),
          (function (e, t) {
            var n, r, s, i, o;
            if (
              !t.fcmOptions &&
              !(null === (n = t.notification) || void 0 === n
                ? void 0
                : n.click_action)
            )
              return;
            e.fcmOptions = {};
            const a =
              null !==
                (s =
                  null === (r = t.fcmOptions) || void 0 === r
                    ? void 0
                    : r.link) && void 0 !== s
                ? s
                : null === (i = t.notification) || void 0 === i
                  ? void 0
                  : i.click_action;
            a && (e.fcmOptions.link = a);
            const c =
              null === (o = t.fcmOptions) || void 0 === o
                ? void 0
                : o.analytics_label;
            c && (e.fcmOptions.analyticsLabel = c);
          })(t, e),
          t
        );
      })(n);
      "function" == typeof t.onBackgroundMessageHandler
        ? await t.onBackgroundMessageHandler(e)
        : t.onBackgroundMessageHandler.next(e);
    }
  }
  function oo() {
    return self.clients.matchAll({ type: "window", includeUncontrolled: !0 });
  }
  function ao(e) {
    return Zi.create("missing-app-config-values", { valueName: e });
  }
  !(function (e, t) {
    const n = [];
    for (let r = 0; r < 20; r++)
      n.push(e.charAt(r)), r < 19 && n.push(t.charAt(r));
    n.join("");
  })("AzSCbw63g1R0nCw85jG8", "Iaya3yLKwmgvh7cF0q4");
  class co {
    constructor(e, t, n) {
      (this.deliveryMetricsExportedToBigQueryEnabled = !1),
        (this.onBackgroundMessageHandler = null),
        (this.onMessageHandler = null),
        (this.logEvents = []),
        (this.isLogServiceStarted = !1);
      const r = (function (e) {
        if (!e || !e.options) throw ao("App Configuration Object");
        if (!e.name) throw ao("App Name");
        const t = ["projectId", "apiKey", "appId", "messagingSenderId"],
          { options: n } = e;
        for (const e of t) if (!n[e]) throw ao(e);
        return {
          appName: e.name,
          projectId: n.projectId,
          apiKey: n.apiKey,
          appId: n.appId,
          senderId: n.messagingSenderId,
        };
      })(e);
      this.firebaseDependencies = {
        app: e,
        appConfig: r,
        installations: t,
        analyticsProvider: n,
      };
    }
    _delete() {
      return Promise.resolve();
    }
  }
  _s(
    new (class {
      constructor(e, t, n) {
        (this.name = e),
          (this.instanceFactory = t),
          (this.type = n),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = "LAZY"),
          (this.onInstanceCreated = null);
      }
      setInstantiationMode(e) {
        return (this.instantiationMode = e), this;
      }
      setMultipleInstances(e) {
        return (this.multipleInstances = e), this;
      }
      setServiceProps(e) {
        return (this.serviceProps = e), this;
      }
      setInstanceCreatedCallback(e) {
        return (this.onInstanceCreated = e), this;
      }
    })(
      "messaging-sw",
      (e) => {
        const t = new co(
          e.getProvider("app").getImmediate(),
          e.getProvider("installations-internal").getImmediate(),
          e.getProvider("analytics-internal"),
        );
        return (
          self.addEventListener("push", (e) => {
            e.waitUntil(io(e, t));
          }),
          self.addEventListener("pushsubscriptionchange", (e) => {
            e.waitUntil(
              (async function (e, t) {
                var n, r;
                const { newSubscription: s } = e;
                if (!s) return void (await ro(t));
                const i = await Ji(t.firebaseDependencies);
                await ro(t),
                  (t.vapidKey =
                    null !==
                      (r =
                        null ===
                          (n = null == i ? void 0 : i.subscriptionOptions) ||
                        void 0 === n
                          ? void 0
                          : n.vapidKey) && void 0 !== r
                      ? r
                      : Ri),
                  await (async function (e) {
                    const t = await (async function (e, t) {
                        return (
                          (await e.pushManager.getSubscription()) ||
                          e.pushManager.subscribe({
                            userVisibleOnly: !0,
                            applicationServerKey: Ui(t),
                          })
                        );
                      })(e.swRegistration, e.vapidKey),
                      n = {
                        vapidKey: e.vapidKey,
                        swScope: e.swRegistration.scope,
                        endpoint: t.endpoint,
                        auth: Fi(t.getKey("auth")),
                        p256dh: Fi(t.getKey("p256dh")),
                      },
                      r = await Ji(e.firebaseDependencies);
                    if (r) {
                      if (
                        (function (e, t) {
                          const n = t.vapidKey === e.vapidKey,
                            r = t.endpoint === e.endpoint,
                            s = t.auth === e.auth,
                            i = t.p256dh === e.p256dh;
                          return n && r && s && i;
                        })(r.subscriptionOptions, n)
                      )
                        return Date.now() >= r.createTime + 6048e5
                          ? (async function (e, t) {
                              try {
                                const n = await (async function (e, t) {
                                    const n = await to(e),
                                      r = no(t.subscriptionOptions),
                                      s = {
                                        method: "PATCH",
                                        headers: n,
                                        body: JSON.stringify(r),
                                      };
                                    let i;
                                    try {
                                      const n = await fetch(
                                        `${eo(e.appConfig)}/${t.token}`,
                                        s,
                                      );
                                      i = await n.json();
                                    } catch (e) {
                                      throw Zi.create("token-update-failed", {
                                        errorInfo:
                                          null == e ? void 0 : e.toString(),
                                      });
                                    }
                                    if (i.error) {
                                      const e = i.error.message;
                                      throw Zi.create("token-update-failed", {
                                        errorInfo: e,
                                      });
                                    }
                                    if (!i.token)
                                      throw Zi.create("token-update-no-token");
                                    return i.token;
                                  })(e.firebaseDependencies, t),
                                  r = Object.assign(Object.assign({}, t), {
                                    token: n,
                                    createTime: Date.now(),
                                  });
                                return await Yi(e.firebaseDependencies, r), n;
                              } catch (e) {
                                throw e;
                              }
                            })(e, {
                              token: r.token,
                              createTime: Date.now(),
                              subscriptionOptions: n,
                            })
                          : r.token;
                      try {
                        await Xi(e.firebaseDependencies, r.token);
                      } catch (e) {
                        console.warn(e);
                      }
                      return so(e.firebaseDependencies, n);
                    }
                    return so(e.firebaseDependencies, n);
                  })(t);
              })(e, t),
            );
          }),
          self.addEventListener("notificationclick", (e) => {
            e.waitUntil(
              (async function (e) {
                var t, n;
                const r =
                  null ===
                    (n =
                      null === (t = e.notification) || void 0 === t
                        ? void 0
                        : t.data) || void 0 === n
                    ? void 0
                    : n[Pi];
                if (!r) return;
                if (e.action) return;
                e.stopImmediatePropagation(), e.notification.close();
                const s = (function (e) {
                  var t, n, r;
                  return (
                    (null !==
                      (n =
                        null === (t = e.fcmOptions) || void 0 === t
                          ? void 0
                          : t.link) && void 0 !== n
                      ? n
                      : null === (r = e.notification) || void 0 === r
                        ? void 0
                        : r.click_action) ||
                    ("object" == typeof (s = e.data) &&
                    s &&
                    "google.c.a.c_id" in s
                      ? self.location.origin
                      : null)
                  );
                  var s;
                })(r);
                if (!s) return;
                const i = new URL(s, self.location.href),
                  o = new URL(self.location.origin);
                if (i.host !== o.host) return;
                let a = await (async function (e) {
                  const t = await oo();
                  for (const n of t) {
                    const t = new URL(n.url, self.location.href);
                    if (e.host === t.host) return n;
                  }
                  return null;
                })(i);
                return (
                  a
                    ? (a = await a.focus())
                    : ((a = await self.clients.openWindow(s)),
                      await new Promise((e) => {
                        setTimeout(e, 3e3);
                      })),
                  a
                    ? ((r.messageType = qi.NOTIFICATION_CLICKED),
                      (r.isFirebaseMessaging = !0),
                      a.postMessage(r))
                    : void 0
                );
              })(e),
            );
          }),
          t
        );
      },
      "PUBLIC",
    ),
  );
  class uo extends Error {
    constructor(e) {
      super(), (this.originalResponse = e);
    }
  }
  const lo = (e) => {
      if (e.status >= 500) throw new uo(e);
    },
    ho = (e, t) => {
      if (t instanceof uo) return t.originalResponse;
      throw new Error(e);
    },
    po = (e) => {
      const t = e.url.searchParams.get("input");
      if (t) return or.parse(t);
    },
    fo = (e) =>
      new Response(JSON.stringify({ result: { data: or.serialize(e) } }), {
        headers: { swcache: "true", "content-type": "application/json" },
      }),
    go = async (e) => {
      const t = e.clone(),
        n = await t.json();
      return or.parse(n);
    };
  var mo;
  self.addEventListener("activate", (e) => {
    const t = d();
    e.waitUntil(
      (async (e, t = "-precache-") => {
        const n = (await self.caches.keys()).filter(
          (n) =>
            n.includes(t) && n.includes(self.registration.scope) && n !== e,
        );
        return await Promise.all(n.map((e) => self.caches.delete(e))), n;
      })(t).then((e) => {}),
    );
  }),
    (mo = self.__WB_MANIFEST || []),
    O().precache(mo),
    (function (e) {
      const t = O();
      u(new D(t, e));
    })(undefined);
  const yo = "base-asset-cache",
    wo = "language-cache";
  self.addEventListener("install", async (e) => {
    const t = ["/", "/index.html"];
    e.waitUntil(caches.open(yo).then((e) => e.addAll(t)));
    const n = ["/assets/i18n/en-us.json?version=development"];
    e.waitUntil(
      caches.delete(wo).then(() => caches.open(wo).then((e) => e.addAll(n))),
    ),
      self.skipWaiting(),
      self.addEventListener("activate", () => self.clients.claim());
  });
  const bo = Ge().then((e) => new Rt(e)),
    _o = Promise.all([Ge(), bo]).then(([e, t]) => new gr(e, t));
  _o.then((e) => {
    e.syncAll();
  }),
    u(
      /\/index\.html/,
      new P({ cacheName: yo, plugins: [new se({ maxAgeSeconds: 2592e3 })] }),
    ),
    u(
      /\/assets\/i18n\/.*/,
      new P({ cacheName: wo, plugins: [new se({ maxAgeSeconds: 2592e3 })] }),
    ),
    u(
      /\/svg\/.*\.svg/,
      new R({
        cacheName: "svg-icon-cache",
        plugins: [new se({ maxAgeSeconds: 5184e3 })],
      }),
    ),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getRecipes/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (t) {
          const n = po(e);
          if (!n) return ho("No input provided", t);
          const {
            userIds: r,
            folder: s,
            orderBy: i,
            orderDirection: o,
            offset: a,
            limit: c,
            recipeIds: u,
            labels: l,
            labelIntersection: h,
            includeAllFriends: d,
            ratings: p,
          } = n;
          if (r) return ho("Cannot query other userIds while offline", t);
          const f = await Ge(),
            g = await ar.getSession();
          if (!g) return ho("Not logged in, can't operate offline", t);
          let m = await f.getAll(Ve.Recipes);
          if (
            ((m = m.filter((e) => e.folder === s)),
            (m = m.sort((e, t) => {
              const n = "asc" === o ? e : t,
                r = "asc" === o ? t : e;
              return "title" === i
                ? n.title.localeCompare(r.title)
                : "createdAt" === i
                  ? r.createdAt.getTime() - n.createdAt.getTime()
                  : "updatedAt" === i
                    ? r.updatedAt.getTime() - n.updatedAt.getTime()
                    : 0;
            })),
            u)
          ) {
            const e = new Set(u);
            m = m.filter((t) => e.has(t.id));
          }
          if (l) {
            const e = new Set(l);
            m = m.filter((t) => {
              if (h)
                return t.recipeLabels.some((t) => {
                  e.has(t.label.title);
                });
              for (const n of e)
                if (!t.recipeLabels.some((e) => e.label.title === n)) return !1;
              return !0;
            });
          }
          d || (m = m.filter((e) => e.userId === g.userId)),
            p && (m = m.filter((e) => p.includes(e.rating)));
          const y = m.length;
          return (m = m.slice(a, a + c)), fo({ recipes: m, totalCount: y });
        }
      },
      "GET",
    ),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getRecipe/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (t) {
          const n = po(e);
          if (!n) return ho("No input provided", t);
          const { id: r } = n,
            s = await Ge(),
            i = await s.get(Ve.Recipes, r);
          return i ? fo(i) : ho("No cache result found", t);
        }
      },
      "GET",
    ),
    ((e) => {
      u(
        /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.searchRecipes/,
        async (t) => {
          try {
            const e = await fetch(t.request);
            return lo(e), e;
          } catch (n) {
            const r = po(t);
            if (!r) return ho("No input provided", n);
            const {
              searchTerm: s,
              userIds: i,
              folder: o,
              labels: a,
              labelIntersection: c,
              includeAllFriends: u,
              ratings: l,
            } = r;
            if (i) return ho("Cannot query other userIds while offline", n);
            const h = await Ge(),
              d = await ar.getSession();
            if (!d) return ho("Not logged in, can't operate offline", n);
            const p = (await e).search(s);
            let f = [];
            for (const e of p) {
              const t = await h.get(Ve.Recipes, e.recipeId);
              t && f.push(t);
            }
            if (((f = f.filter((e) => e.folder === o)), a)) {
              const e = new Set(a);
              f = f.filter((t) => {
                if (c)
                  return t.recipeLabels.some((t) => {
                    e.has(t.label.title);
                  });
                for (const n of e)
                  if (!t.recipeLabels.some((e) => e.label.title === n))
                    return !1;
                return !0;
              });
            }
            return (
              u || (f = f.filter((e) => e.userId === d.userId)),
              l && (f = f.filter((e) => l.includes(e.rating))),
              fo({ recipes: f, totalCount: f.length })
            );
          }
        },
        "GET",
      );
    })(bo),
    ((e) => {
      u(
        /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.updateRecipe/,
        async (t) => {
          const n = await fetch(t.request),
            r = await go(n);
          return (await e).syncRecipe(r.id), n;
        },
        "POST",
      );
    })(_o),
    ((e) => {
      u(
        /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.createRecipe/,
        async (t) => {
          const n = await fetch(t.request),
            r = await go(n);
          return (await e).syncRecipe(r.id), n;
        },
        "POST",
      );
    })(_o),
    ((e) => {
      u(
        /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.delete.*/,
        async (t) => {
          const n = await fetch(t.request);
          return (await e).syncAll(), n;
        },
        "POST",
      );
    })(_o),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.getShoppingLists/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (e) {
          const t = await Ge();
          let n = await t.getAll(Ve.ShoppingLists);
          return fo(n);
        }
      },
      "GET",
    ),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.getShoppingList/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (t) {
          const n = po(e);
          if (!n) return ho("No input provided", t);
          const { id: r } = n,
            s = await Ge(),
            i = await s.get(Ve.ShoppingLists, r);
          return i ? fo(i) : ho("No cache result found", t);
        }
      },
      "GET",
    ),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.getShoppingListItems/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (t) {
          const n = po(e);
          if (!n) return ho("No input provided", t);
          const { shoppingListId: r } = n,
            s = await Ge(),
            i = await s.get(Ve.ShoppingLists, r);
          return i ? fo(i.items) : ho("No cache result found", t);
        }
      },
      "GET",
    ),
    ((e) => {
      u(
        /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.(create|update|delete).*/,
        async (t) => {
          const n = await fetch(t.request);
          return (await e).syncAll(), n;
        },
        "POST",
      );
    })(_o),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.getMealPlans/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (e) {
          const t = await Ge(),
            n = await t.getAll(Ve.MealPlans);
          return fo(n);
        }
      },
      "GET",
    ),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.getMealPlan/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (t) {
          const n = po(e);
          if (!n) return ho("No input provided", t);
          const { id: r } = n,
            s = await Ge(),
            i = await s.get(Ve.MealPlans, r);
          return i ? fo(i) : ho("No cache result found", t);
        }
      },
      "GET",
    ),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.getMealPlanItems/,
      async (e) => {
        try {
          const t = await fetch(e.request);
          return lo(t), t;
        } catch (t) {
          const n = po(e);
          if (!n) return ho("No input provided", t);
          const { mealPlanId: r } = n,
            s = await Ge(),
            i = await s.get(Ve.MealPlans, r);
          return i ? fo(i.items) : ho("No cache result found", t);
        }
      },
      "GET",
    ),
    ((e) => {
      u(
        /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.(create|update|delete).*/,
        async (t) => {
          const n = await fetch(t.request);
          return (await e).syncAll(), n;
        },
        "POST",
      );
    })(_o),
    u(
      /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))/,
      new P({
        cacheName: "api-cache",
        plugins: [new se({ maxAgeSeconds: 5184e3 })],
      }),
    ),
    u(
      /https:\/\/chefbook-prod.*amazonaws\.com\//,
      new R({
        cacheName: "s3-image-cache",
        plugins: [new se({ maxEntries: 200, purgeOnQuotaError: !0 })],
      }),
    );
  try {
    const e = "https://recipesage.com/assets/imgs/logo_green.png",
      t = Es({
        appId: "1:1064631313987:android:b6ca7a14265a6a01",
        apiKey: "AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0",
        projectId: "chef-book",
        messagingSenderId: "1064631313987",
      });
    (vo = (function (
      e = (function (e = fs) {
        const t = ms.get(e);
        if (!t && e === fs && vr()) return Es();
        if (!t) throw Ss.create("no-app", { appName: e });
        return t;
      })(),
    ) {
      return (
        (async function () {
          return (
            (function () {
              try {
                return "object" == typeof indexedDB;
              } catch (e) {
                return !1;
              }
            })() &&
            (await new Promise((e, t) => {
              try {
                let n = !0;
                const r =
                    "validate-browser-context-for-indexeddb-analytics-module",
                  s = self.indexedDB.open(r);
                (s.onsuccess = () => {
                  s.result.close(),
                    n || self.indexedDB.deleteDatabase(r),
                    e(!0);
                }),
                  (s.onupgradeneeded = () => {
                    n = !1;
                  }),
                  (s.onerror = () => {
                    var e;
                    t(
                      (null === (e = s.error) || void 0 === e
                        ? void 0
                        : e.message) || "",
                    );
                  });
              } catch (e) {
                t(e);
              }
            })) &&
            "PushManager" in self &&
            "Notification" in self &&
            ServiceWorkerRegistration.prototype.hasOwnProperty(
              "showNotification",
            ) &&
            PushSubscription.prototype.hasOwnProperty("getKey")
          );
        })().then(
          (e) => {
            if (!e) throw Zi.create("unsupported-browser");
          },
          (e) => {
            throw Zi.create("indexed-db-unsupported");
          },
        ),
        vs(Ai(e), "messaging-sw").getImmediate()
      );
    })(t)),
      (function (e, t) {
        if (void 0 !== self.document) throw Zi.create("only-available-in-sw");
        e.onBackgroundMessageHandler = t;
      })((vo = Ai(vo)), (t) => {
        switch (
          (console.log("Received background message ", t), t.data?.type)
        ) {
          case "update:available":
            return self.registration.update();
          case "messages:new": {
            const n = JSON.parse(t.data.message),
              r = n.otherUser.name || n.otherUser.email;
            return self.registration.showNotification(r, {
              tag: t.data.type + "-" + n.otherUser.id,
              icon: n.recipe?.images.at(0)?.location || e,
              body: n.recipe ? n.recipe.title : n.body,
              data: { type: t.data.type, otherUserId: n.otherUser.id },
            });
          }
        }
      }),
      self.addEventListener("notificationclick", (e) => {
        e.notification.close(),
          e.waitUntil(
            self.clients.matchAll({ type: "window" }).then((t) => {
              for (const e of t) if ("/" == e.url) return e.focus();
              return e.notification.data.recipeId
                ? self.clients.openWindow(
                    `${self.registration.scope}#/recipe/${e.notification.data.recipeId}`,
                  )
                : e.notification.data.otherUserId
                  ? self.clients.openWindow(
                      `${self.registration.scope}#/messages/${e.notification.data.otherUserId}`,
                    )
                  : self.clients.openWindow(self.registration.scope);
            }),
          );
      });
  } catch (Xn) {
    console.error(Xn);
  }
  var vo;
  console.log("Service worker mounted");
})();
