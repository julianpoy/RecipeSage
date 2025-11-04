import { StorageObjectRecord, StorageProvider } from "./";
import { ObjectTypes } from "./shared";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as s3SdkGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import crypto from "crypto";
import { PassThrough } from "stream";

const AWS_BUCKET = process.env.AWS_BUCKET || "";
const AWS_BUCKET_RECIPE_IMAGE = process.env.AWS_BUCKET_RECIPE_IMAGE || "";
const AWS_BUCKET_PROFILE_IMAGE = process.env.AWS_BUCKET_PROFILE_IMAGE || "";
const AWS_BUCKET_DATA_EXPORT = process.env.AWS_BUCKET_DATA_EXPORT || "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-west-2";

if (
  process.env.STORAGE_TYPE === "s3" &&
  (!AWS_BUCKET ||
    !AWS_BUCKET_RECIPE_IMAGE ||
    !AWS_BUCKET_PROFILE_IMAGE ||
    !AWS_BUCKET_DATA_EXPORT ||
    !AWS_BUCKET ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !AWS_REGION)
)
  throw new Error("Missing AWS configuration");

const S3_PUBLIC_READ_ACL = "public-read";
const S3_YEAR_IMMUTABLE_CACHECONTROL = "public,max-age=31536000,immutable"; // 365 Days

// Must begin and end with a /
const ObjectTypesToBucket = {
  [ObjectTypes.RECIPE_IMAGE]: AWS_BUCKET_RECIPE_IMAGE,
  [ObjectTypes.PROFILE_IMAGE]: AWS_BUCKET_PROFILE_IMAGE,
  [ObjectTypes.DATA_EXPORT]: AWS_BUCKET_DATA_EXPORT,
} satisfies Record<ObjectTypes, string>;
const ObjectTypesToACL = {
  [ObjectTypes.RECIPE_IMAGE]: S3_PUBLIC_READ_ACL,
  [ObjectTypes.PROFILE_IMAGE]: S3_PUBLIC_READ_ACL,
  [ObjectTypes.DATA_EXPORT]: undefined,
} satisfies Record<ObjectTypes, ObjectCannedACL | undefined>;
const ObjectTypesToCacheControl = {
  [ObjectTypes.RECIPE_IMAGE]: S3_YEAR_IMMUTABLE_CACHECONTROL,
  [ObjectTypes.PROFILE_IMAGE]: S3_YEAR_IMMUTABLE_CACHECONTROL,
  [ObjectTypes.DATA_EXPORT]: S3_YEAR_IMMUTABLE_CACHECONTROL,
} satisfies Record<ObjectTypes, string | undefined>;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

/**
  This limit is set/enforced by S3 on bulk delete operations
  https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
*/
const DELETE_STORAGE_OBJECTS_LIMIT = 1000;

const generateKey = () => {
  const rand = crypto.randomBytes(7).toString("hex");
  const key = `${Date.now()}-${rand}`;

  return key;
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

export async function getSignedDownloadUrl(
  objectType: ObjectTypes,
  key: string,
  options?: {
    fileExtension?: string;
    expiresInSeconds?: number;
  },
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: ObjectTypesToBucket[objectType],
    Key: key,
    ResponseContentDisposition: `attachment; filename="recipesage-${key}${options?.fileExtension || ""}"`,
  });

  const signedUrl = await s3SdkGetSignedUrl(s3, command, {
    expiresIn: options?.expiresInSeconds || 3600,
  });

  return signedUrl;
}

export const writeBuffer = async (
  objectType: ObjectTypes,
  buffer: Buffer,
  mimetype: string,
): Promise<StorageObjectRecord> => {
  const key = generateKey();

  const s3Response = await s3.send(
    new PutObjectCommand({
      Bucket: ObjectTypesToBucket[objectType],
      Key: key,
      ACL: ObjectTypesToACL[objectType],
      CacheControl: ObjectTypesToCacheControl[objectType],
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return {
    objectType,
    mimetype,
    size: Buffer.byteLength(buffer).toString(),
    bucket: ObjectTypesToBucket[objectType],
    key,
    acl: ObjectTypesToACL[objectType],
    location: generateStorageLocation(key),
    etag: s3Response.ETag || "",
  };
};

export const writeStream = async (
  objectType: ObjectTypes,
  stream: PassThrough,
  mimetype: string,
): Promise<StorageObjectRecord> => {
  const key = generateKey();

  const uploadRef = new Upload({
    client: s3,
    params: {
      Bucket: ObjectTypesToBucket[objectType],
      Key: key,
      ACL: ObjectTypesToACL[objectType],
      CacheControl: ObjectTypesToCacheControl[objectType],
      Body: stream,
      ContentType: mimetype,
    },
    //queueSize: 4, // optional concurrency configuration
    //leavePartsOnError: true, // optional manually handle dropped parts
  });

  const s3Response = await uploadRef.done();

  return {
    objectType,
    mimetype,
    size: "-1",
    bucket: ObjectTypesToBucket[objectType],
    key,
    acl: ObjectTypesToACL[objectType],
    location: generateStorageLocation(key),
    etag: s3Response.ETag || "",
  };
};

export const deleteObject = async (objectType: ObjectTypes, key: string) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: ObjectTypesToBucket[objectType],
      Key: key,
    }),
  );

  return;
};

export const deleteObjects = async (
  objectType: ObjectTypes,
  keys: string[],
) => {
  const paginatedKeys = paginate(keys, DELETE_STORAGE_OBJECTS_LIMIT);

  await Promise.all(
    paginatedKeys.map((keyPage) => {
      return s3.send(
        new DeleteObjectsCommand({
          Bucket: ObjectTypesToBucket[objectType],
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
  getSignedDownloadUrl,
  writeBuffer,
  writeStream,
  deleteObject,
  deleteObjects,
} satisfies StorageProvider as StorageProvider;
