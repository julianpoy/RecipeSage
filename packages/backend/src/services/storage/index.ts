import * as S3Storage from "./s3";
import * as FirebaseStorage from "./firebase";
import * as FilesystemStorage from "./filesystem";
import { ObjectTypes } from "./shared";

export interface StorageObjectRecord {
  objectType: ObjectTypes;
  mimetype: string;
  size: string;
  bucket: string;
  key: string;
  acl: string;
  location: string;
  etag: string;
}

export interface StorageProvider {
  writeBuffer: (
    objectType: ObjectTypes,
    buffer: Buffer,
    mimetype: string,
  ) => Promise<StorageObjectRecord>;

  deleteObject: (key: string) => Promise<void>;

  deleteObjects: (keys: string[]) => Promise<void>;
}

const storageProviders: {
  [key: string]: StorageProvider;
} = {
  s3: S3Storage,
  firebase: FirebaseStorage,
  filesystem: FilesystemStorage,
};

if (!process.env.STORAGE_TYPE)
  throw new Error(
    'STORAGE_TYPE not set. Can be set to "s3", "firebase", or "filesystem".',
  );
// STORAGE_TYPE used to accept S3 and FIREBASE. toLowerCase for compatibility.
const storageProvider =
  storageProviders[process.env.STORAGE_TYPE.toLowerCase()];
if (!storageProvider) throw new Error("Invalid STORAGE_TYPE");

export const writeBuffer = storageProvider.writeBuffer;
export const deleteObject = storageProvider.deleteObject;
export const deleteObjects = storageProvider.deleteObjects;
