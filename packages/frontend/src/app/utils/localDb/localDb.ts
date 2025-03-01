import { DBSchema, IDBPDatabase, openDB } from "idb";
import * as Sentry from "@sentry/browser";
import {
  AssistantMessageSummary,
  JobSummary,
  LabelGroupSummary,
  LabelSummary,
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
  UserProfiles = "userProfiles",
  AssistantMessages = "assistantMessages",
  Jobs = "jobs",
  KV = "kvStore",
}

export enum KVStoreKeys {
  Session = "session",
  RecipeSearchIndex = "recipeSearchIndex",
  LastSessionUserId = "lastSessionUserId",
  MyUserProfile = "myUserProfile",
  MyFriends = "myFriends",
  MyStats = "myStats",
  LastSuccessfulSyncDate = "lastSuccessfulSyncDate",
}

export interface KVSession {
  key: KVStoreKeys.Session;
  value: SessionDTO;
}
export interface KVRecipeSearchIndex {
  key: KVStoreKeys.RecipeSearchIndex;
  value: string;
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
export interface KVLastSuccessfulSyncDate {
  key: KVStoreKeys.LastSuccessfulSyncDate;
  value: Date;
}

export type KVStoreValue = {
  [KVStoreKeys.Session]: KVSession;
  [KVStoreKeys.RecipeSearchIndex]: KVRecipeSearchIndex;
  [KVStoreKeys.LastSessionUserId]: KVLastSessionUserId;
  [KVStoreKeys.MyUserProfile]: KVMyUserProfile;
  [KVStoreKeys.MyFriends]: KVMyFriends;
  [KVStoreKeys.MyStats]: KVMyStats;
  [KVStoreKeys.LastSuccessfulSyncDate]: KVLastSuccessfulSyncDate;
};

export interface RSLocalDB extends DBSchema {
  [ObjectStoreName.Recipes]: {
    key: string;
    value: RecipeSummary;
    indexes: {
      userId: string;
      idUpdatedAt: [string, Date];
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

  return openDB<RSLocalDB>(`localDb`, migrations.length, {
    upgrade: (db, previousVersion, newVersion, transaction) => {
      console.log(
        `Local DB upgrading from ${previousVersion} to ${newVersion}`,
      );

      try {
        let i = previousVersion;
        while (i < migrations.length) {
          migrations[i](db, transaction);
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
};

let localDbP: Promise<IDBPDatabase<RSLocalDB>> | undefined = undefined;
export async function getLocalDb() {
  if (!localDbP) {
    localDbP = connect().then((localDb) => {
      console.log("LocalDB Opened", localDb);
      return localDb;
    });
  }

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

export const setKvStoreEntry = async (
  value: KVStoreValue[keyof KVStoreValue],
): Promise<void> => {
  const localDb = await getLocalDb();

  await localDb.put(ObjectStoreName.KV, value);

  return;
};

export const deleteKvStoreEntry = async (key: KVStoreKeys): Promise<void> => {
  const localDb = await getLocalDb();

  await localDb.delete(ObjectStoreName.KV, key);

  return;
};
