import { Injectable } from "@angular/core";
import { getLocalDb, ObjectStoreName } from "../utils/localDb/localDb";
import {
  sendMessageToSW,
  SWMessageType,
} from "../utils/localDb/sendMessageToSW";
import { environment } from "../../environments/environment";

const CONSOLE_LOGS_HISTORY_MAX = 500;
const TRPC_REQUEST_HISTORY_MAX = 200;

const store = {
  logs: [],
  trpc: [],
} as {
  logs: {
    type: string;
    datetime: string;
    value: any;
  }[];
  trpc: unknown[];
};

@Injectable({
  providedIn: "root",
})
export class DebugStoreService {
  private store = store;

  constructor() {
    this.initDebugStoreMonkeypatch();
  }

  async createDebugDump() {
    return {
      manifestDb: await this.dumpLocalDb(),
      logs: this.store.logs,
      trpc: this.store.trpc,
      userAgent: navigator.userAgent,
      windowWidth: self.innerWidth,
      windowHeight: self.innerHeight,
      version: (window as any).version,
      sw: {
        isPresent: !!navigator.serviceWorker.controller,
        state: navigator.serviceWorker.controller?.state,
        url: navigator.serviceWorker.controller?.scriptURL,
        dump:
          (await sendMessageToSW(
            {
              type: SWMessageType.GetDebugDump,
            },
            {
              timeout: 2000,
            },
          ).catch((e) => {
            console.error("Error while retrieving SW debug dump", e);
          })) || "failed",
      },
    };
  }

  async dumpLocalDb() {
    const manifestDb = await getLocalDb();

    const dump = {
      recipes: await manifestDb.getAll(ObjectStoreName.Recipes),
      labels: await manifestDb.getAll(ObjectStoreName.Labels),
      labelGroups: await manifestDb.getAll(ObjectStoreName.LabelGroups),
      shoppingLists: await manifestDb.getAll(ObjectStoreName.ShoppingLists),
      mealPlans: await manifestDb.getAll(ObjectStoreName.MealPlans),
      userProfiles: await manifestDb.getAll(ObjectStoreName.UserProfiles),
      assistantMessages: await manifestDb.getAll(
        ObjectStoreName.AssistantMessages,
      ),
      jobs: await manifestDb.getAll(ObjectStoreName.Jobs),
      kv: await manifestDb.getAll(ObjectStoreName.KV),
    };

    return dump;
  }

  stringifyDebugDump(dump: Awaited<ReturnType<typeof this.createDebugDump>>) {
    return JSON.stringify(dump, this.jsonFriendlyErrorReplacer);
  }

  createSWDebugDump() {
    return {
      logs: this.store.logs,
    };
  }

  private initDebugStoreMonkeypatch() {
    if (!environment.production) {
      console.warn("In dev mode, disabling debugStore monkeypatch");
      return;
    }

    const _this = this;
    const methodsToPatch = ["log", "info", "warn", "error"] as const;

    for (const method of methodsToPatch) {
      const boundMethod = console[method].bind(console);

      console[method] = function (...args) {
        store.logs.push({
          type: method,
          datetime: Date().toLocaleString(),
          value: args,
        });
        if (store.logs.length > CONSOLE_LOGS_HISTORY_MAX) {
          store.logs.splice(CONSOLE_LOGS_HISTORY_MAX);
        }

        boundMethod.apply(console, args);
      };
    }

    self.addEventListener("error", (event) => {
      _this.store.logs.push({
        type: "uncaughtError",
        datetime: new Date().toLocaleString(),
        value: event,
      });
    });

    self.addEventListener("unhandledrejection", (event) => {
      _this.store.logs.push({
        type: "unhandledRejection",
        datetime: new Date().toLocaleString(),
        value: event,
      });
    });
  }

  private jsonFriendlyErrorReplacer(_key: string, value: unknown) {
    if (value instanceof PromiseRejectionEvent) {
      return {
        reason: value.reason,
      };
    }
    if (value instanceof ErrorEvent) {
      return {
        error: value.error,
      };
    }
    if (value instanceof Error) {
      const plaintextObj: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(value)) {
        plaintextObj[key] = (value as any)[key];
      }
      return plaintextObj;
    }

    return value;
  }
}

export function captureTrpcRequest(entry: unknown) {
  store.trpc.push(entry);
  if (store.trpc.length > TRPC_REQUEST_HISTORY_MAX) {
    store.trpc.splice(TRPC_REQUEST_HISTORY_MAX);
  }
}
