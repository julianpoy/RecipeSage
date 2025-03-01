import { IDBPDatabase, type IDBPTransaction } from "idb";
import { ObjectStoreName, type RSLocalDB } from "../localDb";

export const localDBMigration_2 = (
  db: IDBPDatabase<RSLocalDB>,
  _transaction: IDBPTransaction<RSLocalDB, ObjectStoreName[], "versionchange">,
) => {
  db.createObjectStore(ObjectStoreName.UserProfiles, {
    keyPath: "id",
  });
  db.createObjectStore(ObjectStoreName.AssistantMessages, {
    keyPath: "id",
  });
  db.createObjectStore(ObjectStoreName.Jobs, {
    keyPath: "id",
  });
};
