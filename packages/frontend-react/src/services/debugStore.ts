import { getLocalDb, ObjectStoreName } from "../utils/localDb/localDb";
import {
  sendMessageToSW,
  SWMessageType,
} from "../utils/localDb/sendMessageToSW";
import { environment, IS_DESKTOP } from "../environments/environment";
import { detectAppPlatform } from "@recipesage/util/shared";

const CONSOLE_LOGS_HISTORY_MAX = 500;
const TRPC_REQUEST_HISTORY_MAX = 200;

const store: {
  logs: {
    type: string;
    datetime: string;
    value: unknown;
  }[];
  trpc: unknown[];
} = {
  logs: [],
  trpc: [],
};

class DebugStore {
  private store = store;

  constructor() {
    this.initDebugStoreMonkeypatch();
  }

  async createDebugDump() {
    return {
      manifestDb: await this.dumpLocalDb(),
      logs: this.store.logs,
      trpc: this.store.trpc,
      platform: detectAppPlatform(IS_DESKTOP),
      userAgent: navigator.userAgent,
      windowWidth: self.innerWidth,
      windowHeight: self.innerHeight,
      version: window.version,
      storage: {
        persisted: navigator.storage?.persisted
          ? await navigator.storage.persisted().catch(() => "failed")
          : "unsupported",
        estimate: navigator.storage?.estimate
          ? await navigator.storage.estimate().catch(() => "failed")
          : "unsupported",
        displayModeStandalone: window.matchMedia("(display-mode: standalone)")
          .matches,
      },
      sw: {
        isPresent: !!navigator.serviceWorker?.controller,
        state: navigator.serviceWorker?.controller?.state,
        url: navigator.serviceWorker?.controller?.scriptURL,
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

    const methodsToPatch: readonly ("log" | "info" | "warn" | "error")[] = [
      "log",
      "info",
      "warn",
      "error",
    ];

    for (const method of methodsToPatch) {
      const boundMethod = console[method].bind(console);

      console[method] = (...args) => {
        this.pushLog(method, args);

        boundMethod.apply(console, args);
      };
    }

    self.addEventListener("error", (event) => {
      this.pushLog("uncaughtError", event);
    });

    self.addEventListener("unhandledrejection", (event) => {
      this.pushLog("unhandledRejection", event);
    });
  }

  private pushLog(type: string, value: unknown) {
    this.store.logs.push({
      type,
      datetime: new Date().toLocaleString(),
      value,
    });

    if (this.store.logs.length > CONSOLE_LOGS_HISTORY_MAX) {
      this.store.logs.splice(
        0,
        this.store.logs.length - CONSOLE_LOGS_HISTORY_MAX,
      );
    }
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
        plaintextObj[key] = Object.getOwnPropertyDescriptor(value, key)?.value;
      }
      return plaintextObj;
    }

    return value;
  }
}

export const debugStore = new DebugStore();

export function captureTrpcRequest(entry: unknown) {
  store.trpc.push(entry);
  if (store.trpc.length > TRPC_REQUEST_HISTORY_MAX) {
    store.trpc.splice(0, store.trpc.length - TRPC_REQUEST_HISTORY_MAX);
  }
}
