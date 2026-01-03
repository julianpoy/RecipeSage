import { PassThrough, Readable } from "stream";
import { StorageObjectRecord, type StorageProvider } from "./";
import { ObjectTypes } from "./shared";
import crypto from "crypto";
import { getStorage } from "firebase-admin/storage";

const BUCKET = process.env.FIREBASE_BUCKET || "";
if (!BUCKET && process.env.STORAGE_TYPE === "firebase")
  throw new Error("FIREBASE_STORAGE_BUCKET not set");

// Must begin and end with a /
const ObjectTypesToSubpath = {
  [ObjectTypes.RECIPE_IMAGE]: ObjectTypes.RECIPE_IMAGE,
  [ObjectTypes.PROFILE_IMAGE]: ObjectTypes.PROFILE_IMAGE,
  [ObjectTypes.DATA_EXPORT]: ObjectTypes.DATA_EXPORT,
  [ObjectTypes.IMPORT_DATA]: ObjectTypes.IMPORT_DATA,
};

// Generate a unique key for the object
const generateKey = (objectType: ObjectTypes): string => {
  const rand = crypto.randomBytes(7).toString("hex");
  const key = `${Date.now()}-${rand}`;

  return `${ObjectTypesToSubpath[objectType]}/${key}`;
};

// Generate a public URL for the object
const generateStorageLocation = (key: string): string => {
  const location = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    key,
  )}?alt=media`;

  return location;
};

export const getSignedDownloadUrl = async (
  objectType: ObjectTypes,
  key: string,
) => {
  return generateStorageLocation(key);
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

export const writeStream = async (
  objectType: ObjectTypes,
  stream: PassThrough | Readable,
  mimetype: string,
): Promise<StorageObjectRecord> => {
  const bucket = getStorage().bucket(BUCKET);

  const key = generateKey(objectType);

  await bucket.file(key).save(stream, {
    contentType: mimetype,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  await bucket.file(key).makePublic();

  return {
    objectType,
    mimetype,
    size: "-1",
    bucket: BUCKET,
    key,
    acl: "public-read",
    location: generateStorageLocation(key),
    etag: "",
  };
};

// Delete an object from firebase storage
export const deleteObject = async (
  _objectType: ObjectTypes,
  key: string,
): Promise<void> => {
  const bucket = getStorage().bucket(BUCKET);

  await bucket.file(key).delete({
    ignoreNotFound: true,
  });
};

// Delete multiple objects from firebase storage
export const deleteObjects = async (
  _objectType: ObjectTypes,
  keys: string[],
): Promise<void> => {
  const bucket = getStorage().bucket(BUCKET);

  await Promise.all(
    keys.map((key) =>
      bucket.file(key).delete({
        ignoreNotFound: true,
      }),
    ),
  );
};

export async function readStream(
  _objectType: ObjectTypes,
  key: string,
): Promise<Readable> {
  const bucket = getStorage().bucket(BUCKET);
  return bucket.file(key).createReadStream();
}

export default {
  getSignedDownloadUrl,
  writeBuffer,
  writeStream,
  deleteObject,
  deleteObjects,
  readStream,
} satisfies StorageProvider as StorageProvider;
