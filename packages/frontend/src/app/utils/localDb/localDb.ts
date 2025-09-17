import * as Sentry from "@sentry/browser";
import { DBSchema, IDBPDatabase, openDB } from "idb";

import {
  AssistantMessageSummary,
  JobSummary,
  LabelGroupSummary,
  LabelSummary,
  MealOptionSummary,
  MealPlanSummaryWithItems,
  RecipeSummary,
  SessionDTO,
  ShoppingListSummaryWithItems,
  UserPublic,
} from "@recipesage/prisma";
import { trpcClient as trpc } from "../trpcClient";
import { localDBMigration_1 } from "./migrations/localDBMigration_1";
import { localDBMigration_2 } from "./migrations/localDBMigration_2";

export enum ObjectStoreName {
  Recipes = "recipes",
  Labels = "labels",
  LabelGroups = "labelGroups",
  ShoppingLists = "shoppingLists",
  MealPlans = "mealPlans",
  MealOptions = "mealOptions",
  UserProfiles = "userProfiles",
  AssistantMessages = "assistantMessages",
  Jobs = "jobs",
  KV = "kvStore",
}

export enum KVStoreKeys {
  Session = "session",
  RecipeSearchIndex = "recipeSearchIndex",
  LastSync = "lastSync",
  LastSessionUserId = "lastSessionUserId",
  MyUserProfile = "myUserProfile",
  MyFriends = "myFriends",
  MyStats = "myStats",
}

export interface KVSession {
  key: KVStoreKeys.Session;
  value: SessionDTO;
}
export interface KVRecipeSearchIndex {
  key: KVStoreKeys.RecipeSearchIndex;
  value: string;
}
export interface KVLastSync {
  key: KVStoreKeys.LastSync;
  value: {
    datetime: Date;
  };
}
export interface KVLastSessionUserId {
  key: KVStoreKeys.LastSessionUserId;
  value: string;
}
export interface KVMyUserProfile {
  key: KVStoreKeys.MyUserProfile;
  value: Awaited<ReturnType<typeof trpc.users.getMe.query>>;
}
export interface KVMyFriends {
  key: KVStoreKeys.MyFriends;
  value: Awaited<ReturnType<typeof trpc.users.getMyFriends.query>>;
}
export interface KVMyStats {
  key: KVStoreKeys.MyStats;
  value: Awaited<ReturnType<typeof trpc.users.getMyStats.query>>;
}

export type KVStoreValue = {
  [KVStoreKeys.Session]: KVSession;
  [KVStoreKeys.RecipeSearchIndex]: KVRecipeSearchIndex;
  [KVStoreKeys.LastSync]: KVLastSync;
  [KVStoreKeys.LastSessionUserId]: KVLastSessionUserId;
  [KVStoreKeys.MyUserProfile]: KVMyUserProfile;
  [KVStoreKeys.MyFriends]: KVMyFriends;
  [KVStoreKeys.MyStats]: KVMyStats;
};

export interface RSLocalDB extends DBSchema {
  [ObjectStoreName.Recipes]: {
    key: string;
    value: RecipeSummary;
    indexes: {
      userId: string;
    };
  };
  [ObjectStoreName.Labels]: {
    key: string;
    value: LabelSummary;
    indexes: {
      userId: string;
      title: string;
      labelGroupId: string;
    };
  };
  [ObjectStoreName.MealOptions]: {
    key: string;
    value: MealOptionSummary;
    indexes: {
      userId: string;
    };
  };
  [ObjectStoreName.LabelGroups]: {
    key: string;
    value: LabelGroupSummary;
    indexes: {
      userId: string;
    };
  };
  [ObjectStoreName.ShoppingLists]: {
    key: string;
    value: ShoppingListSummaryWithItems;
    indexes: {
      userId: string;
    };
  };
  [ObjectStoreName.MealPlans]: {
    key: string;
    value: MealPlanSummaryWithItems;
    indexes: {
      userId: string;
    };
  };
  [ObjectStoreName.UserProfiles]: {
    key: string;
    value: UserPublic;
  };
  [ObjectStoreName.AssistantMessages]: {
    key: string;
    value: AssistantMessageSummary;
  };
  [ObjectStoreName.Jobs]: {
    key: string;
    value: JobSummary;
  };
  [ObjectStoreName.KV]: {
    key: string;
    value: KVStoreValue[keyof KVStoreValue];
  };
}

const connect = () => {
  const migrations = [localDBMigration_1, localDBMigration_2];

  const dbP = openDB<RSLocalDB>(`localDb`, migrations.length, {
    blocking: async () => {
      dbP.then((db) => {
        db.close();

        // This script can be used from a service worker, and if so we
        // want to trigger an update of the service worker to the latest
        // else reload the page.
        if (
          "registration" in self &&
          self.registration instanceof ServiceWorkerRegistration
        ) {
          // We're in a service worker
          self.registration.update();
        } else {
          // We're in a window
          const confirmed = prompt(
            "A new version of the app is available. The app will refresh to load the new version",
          );
          if (confirmed) self.location.reload();
          else alert("The app will not work correctly until it is refreshed");
        }
      });
    },
    upgrade: (db, previousVersion, newVersion) => {
      console.log(
        `Local DB upgrading from ${previousVersion} to ${newVersion}`,
      );

      try {
        let i = previousVersion;
        while (i < migrations.length) {
          migrations[i](db);
          i++;
        }
      } catch (e) {
        console.error(e);
        Sentry.captureException(e, {
          extra: {
            info: "Localdb failed to upgrade!",
          },
        });

        throw e;
      }

      console.log(`Local DB upgraded from ${previousVersion} to ${newVersion}`);
    },
  });

  return dbP;
};

let localDbP: Promise<IDBPDatabase<RSLocalDB>> | undefined = undefined;
export async function getLocalDb() {
  if (!localDbP) localDbP = connect();

  const localDb = await localDbP;
  return localDb;
}

export const getKvStoreEntry = async <T extends KVStoreKeys>(
  key: T,
): Promise<KVStoreValue[T]["value"] | undefined> => {
  const localDb = await getLocalDb();

  const result = await localDb.get(ObjectStoreName.KV, key);

  const typedResult = result as KVStoreValue[T] | undefined;

  return typedResult?.value;
};
