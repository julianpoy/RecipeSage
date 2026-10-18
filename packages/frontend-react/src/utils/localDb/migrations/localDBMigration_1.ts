import { IDBPDatabase } from "idb";
import { ObjectStoreName, type RSLocalDB } from "../localDb";

export const localDBMigration_1 = (db: IDBPDatabase<RSLocalDB>) => {
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

  const labelGroupsDb = db.createObjectStore(ObjectStoreName.LabelGroups, {
    keyPath: "id",
  });
  labelGroupsDb.createIndex("userId", "userId", { unique: false });

  const shoppingListsDb = db.createObjectStore(ObjectStoreName.ShoppingLists, {
    keyPath: "id",
  });
  shoppingListsDb.createIndex("userId", "userId", { unique: false });

  const mealPlansDb = db.createObjectStore(ObjectStoreName.MealPlans, {
    keyPath: "id",
  });
  mealPlansDb.createIndex("userId", "userId", { unique: false });

  db.createObjectStore(ObjectStoreName.KV, {
    keyPath: "key",
  });
};
