import { StorageObjectRecord, StorageProvider } from "./";
import { ObjectTypes } from "./shared";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import * as crypto from "crypto";

// Must begin and end with a /
const ObjectTypesToSubpath = {
  [ObjectTypes.RECIPE_IMAGE]: "",
  [ObjectTypes.PROFILE_IMAGE]: "",
};

const AWS_BUCKET = process.env.AWS_BUCKET || "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-west-2";

if (
  process.env.STORAGE_TYPE === "s3" &&
  (!AWS_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION)
)
  throw new Error("Missing AWS configuration");

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const S3_DEFAULT_ACL = "public-read";
const S3_DEFAULT_CACHECONTROL = "public,max-age=31536000,immutable"; // 365 Days
/**
  This limit is set/enforced by S3 on bulk delete operations
  https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
*/
const DELETE_STORAGE_OBJECTS_LIMIT = 1000;

const generateKey = (objectType: ObjectTypes) => {
  const rand = crypto.randomBytes(7).toString("hex");
  const key = `${Date.now()}-${rand}`;

  return `${ObjectTypesToSubpath[objectType]}${key}`;
};

const generateStorageLocation = (key: string) => {
  const basePath = `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;

  return `${basePath}/${key}`;
};

const paginate = <T>(objects: T[], limit: number): T[][] => {
  const mut = [...objects];

  const out: T[][] = [];
  while (mut.length > 0) {
    out.push(mut.splice(0, limit));
  }

  return out;
};

export const writeBuffer = async (
  objectType: ObjectTypes,
  buffer: Buffer,
  mimetype: string,
): Promise<StorageObjectRecord> => {
  const key = generateKey(objectType);

  const s3Response = await s3.send(
    new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      ACL: S3_DEFAULT_ACL,
      CacheControl: S3_DEFAULT_CACHECONTROL,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return {
    objectType,
    mimetype,
    size: Buffer.byteLength(buffer).toString(),
    bucket: AWS_BUCKET,
    key,
    acl: S3_DEFAULT_ACL,
    location: generateStorageLocation(key),
    etag: s3Response.ETag || "",
  };
};

export const deleteObject = async (key: string) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
    }),
  );

  return;
};

export const deleteObjects = async (keys: string[]) => {
  const paginatedKeys = paginate(keys, DELETE_STORAGE_OBJECTS_LIMIT);

  await Promise.all(
    paginatedKeys.map((keyPage) => {
      return s3.send(
        new DeleteObjectsCommand({
          Bucket: AWS_BUCKET,
          Delete: {
            Objects: keyPage.map((key) => ({ Key: key })),
          },
        }),
      );
    }),
  );

  return;
};

export default {
  writeBuffer,
  deleteObject,
  deleteObjects,
} as StorageProvider;
