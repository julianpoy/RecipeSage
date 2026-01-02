import { StorageObjectRecord, type StorageProvider } from "./";
import { ObjectTypes } from "./shared";
import fs from "fs/promises";
import { createReadStream } from "fs";
import crypto from "crypto";
import { join, dirname } from "path";
import { PassThrough, Readable } from "stream";

if (
  process.env.STORAGE_TYPE === "filesystem" &&
  !process.env.FILESYSTEM_STORAGE_PATH
) {
  throw new Error("FILESYSTEM_STORAGE_PATH not set");
}

const FILESYSTEM_STORAGE_PATH = process.env.FILESYSTEM_STORAGE_PATH || "";

// Generate a unique key for the object
export const generateKey = (objectType: ObjectTypes): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const rand = crypto.randomBytes(7).toString("hex");

  const key = `${objectType}/${year}/${month}/${Date.now()}-${rand}`;

  return key;
};

const generateStorageLocation = (
  objectType: ObjectTypes,
  key: string,
): string => {
  // Generate the location of the object for the browser to resolve
  // this won't refer to the file, but rather the URL that the browser
  // will use to fetch the file
  const location = `api/images/filesystem/${key}`;

  return location;
};

export const getSignedDownloadUrl = async (
  objectType: ObjectTypes,
  key: string,
) => {
  return generateStorageLocation(objectType, key);
};

// Write a file to the filesystem
export const writeBuffer = async (
  objectType: ObjectTypes,
  buffer: Buffer,
  mimetype: string,
): Promise<StorageObjectRecord> => {
  const key = generateKey(objectType);
  const location = generateStorageLocation(objectType, key);

  const fsLocation = join(FILESYSTEM_STORAGE_PATH, key);
  await fs.mkdir(dirname(fsLocation), {
    recursive: true,
  });
  await fs.writeFile(fsLocation, buffer);

  const result = {
    objectType,
    mimetype,
    size: Buffer.byteLength(buffer).toString(),
    bucket: "filesystem",
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
  const key = generateKey(objectType);
  const location = generateStorageLocation(objectType, key);

  const fsLocation = join(FILESYSTEM_STORAGE_PATH, key);
  await fs.mkdir(dirname(fsLocation), {
    recursive: true,
  });
  await fs.writeFile(fsLocation, stream);

  const result = {
    objectType,
    mimetype,
    size: "-1",
    bucket: "filesystem",
    key,
    acl: "public-read",
    location,
    etag: "",
  };

  return result;
};

// Delete a file from the filesystem
export const deleteObject = async (
  _objectType: ObjectTypes,
  key: string,
): Promise<void> => {
  try {
    await fs.unlink(key);
  } catch (e) {
    console.warn(e);
  }
};

// Delete multiple files from the filesystem
export const deleteObjects = async (
  _objectType: ObjectTypes,
  keys: string[],
): Promise<void> => {
  await Promise.all(keys.map((key) => deleteObject(_objectType, key)));
};

export async function readStream(
  _objectType: ObjectTypes,
  key: string,
): Promise<Readable> {
  const fsLocation = join(FILESYSTEM_STORAGE_PATH, key);
  return createReadStream(fsLocation);
}

export default {
  getSignedDownloadUrl,
  writeBuffer,
  writeStream,
  deleteObject,
  deleteObjects,
  readStream,
} satisfies StorageProvider as StorageProvider;
