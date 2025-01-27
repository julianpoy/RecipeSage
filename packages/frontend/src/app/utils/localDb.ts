import { IDBPDatabase, openDB } from "idb";
import * as Sentry from "@sentry/browser";

export enum ObjectStoreName {
  Recipes = "recipes",
  Labels = "labels",
  LabelGroups = "labelGroups",
  ShoppingLists = "shoppingLists",
  MealPlans = "mealPlans",
  KV = "kvStore",
}

export enum KVStoreKeys {
  Session = "session",
  RecipeSearchIndex = "recipeSearchIndex",
  LastSessionUserId = "lastSessionUserId",
}

const connect = () => {
  return openDB(`localDb`, 1, {
    upgrade: (db, previousVersion, newVersion) => {
      console.log(
        `Local DB upgrading from ${previousVersion} to ${newVersion}`,
      );

      try {
        switch (previousVersion) {
          case 0: {
            const recipesDb = db.createObjectStore(ObjectStoreName.Recipes, {
              keyPath: "id",
            });
            recipesDb.createIndex("userId", "userId", { unique: false });

            const labelsDb = db.createObjectStore(ObjectStoreName.Labels, {
              keyPath: "id",
            });
            labelsDb.createIndex("userId", "userId", { unique: false });
            labelsDb.createIndex("title", "title", { unique: false });
            labelsDb.createIndex("labelGroupId", "labelGroupId", {
              unique: false,
            });

            const labelGroupsDb = db.createObjectStore(
              ObjectStoreName.LabelGroups,
              {
                keyPath: "id",
              },
            );
            labelGroupsDb.createIndex("userId", "userId", { unique: false });

            const shoppingListsDb = db.createObjectStore(
              ObjectStoreName.ShoppingLists,
              {
                keyPath: "id",
              },
            );
            shoppingListsDb.createIndex("userId", "userId", { unique: false });

            const mealPlansDb = db.createObjectStore(
              ObjectStoreName.MealPlans,
              {
                keyPath: "id",
              },
            );
            mealPlansDb.createIndex("userId", "userId", { unique: false });

            db.createObjectStore(ObjectStoreName.KV, {
              keyPath: "key",
            });

            return;
          }
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

let localDbP: Promise<IDBPDatabase> | undefined = undefined;
export async function getLocalDb() {
  if (!localDbP) localDbP = connect();

  const localDb = await localDbP;
  return localDb;
}
