import { StorageObjectRecord } from "./";
import { ObjectTypes } from "./shared";
import * as crypto from "crypto";
import { getStorage } from "firebase-admin/storage";

const BUCKET = process.env.FIREBASE_BUCKET || "";
if (!BUCKET && process.env.STORAGE_TYPE === "firebase")
  throw new Error("FIREBASE_STORAGE_BUCKET not set");

// Must begin and end with a /
const ObjectTypesToSubpath = {
  [ObjectTypes.RECIPE_IMAGE]: ObjectTypes.RECIPE_IMAGE,
  [ObjectTypes.PROFILE_IMAGE]: ObjectTypes.PROFILE_IMAGE,
};

// Generate a unique key for the object
const generateKey = (objectType: ObjectTypes): string => {
  const rand = crypto.randomBytes(7).toString("hex");
  const key = `${Date.now()}-${rand}`;

  return `${ObjectTypesToSubpath[objectType]}/${key}`;
};

// Generate a public URL for the object
const generateStorageLocation = (key: string): string => {
  const location = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${key}?alt=media`;

  return location;
};

// Write an object to firebase storage
export const writeBuffer = async (
  objectType: ObjectTypes,
  buffer: Buffer,
  mimetype: string,
): Promise<StorageObjectRecord> => {
  const bucket = getStorage().bucket(BUCKET);

  const key = generateKey(objectType);
  const location = generateStorageLocation(key);

  await bucket.file(key).save(buffer, {
    contentType: mimetype,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });
  await bucket.file(key).makePublic();

  const result = {
    objectType,
    mimetype,
    size: Buffer.byteLength(buffer).toString(),
    bucket: BUCKET,
    key,
    acl: "public-read",
    location,
    etag: "",
  };

  return result;
};

// Delete an object from firebase storage
export const deleteObject = async (key: string): Promise<void> => {
  const bucket = getStorage().bucket(BUCKET);

  await bucket.file(key).delete({
    ignoreNotFound: true,
  });
};

// Delete multiple objects from firebase storage
export const deleteObjects = async (keys: string[]): Promise<void> => {
  const bucket = getStorage().bucket(BUCKET);

  await Promise.all(
    keys.map((key) =>
      bucket.file(key).delete({
        ignoreNotFound: true,
      }),
    ),
  );
};
