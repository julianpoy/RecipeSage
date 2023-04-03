import {StorageObjectRecord, writeBuffer} from './index';
import {ObjectTypes} from './shared';
import * as fs from 'fs/promises';
import {transformImageBuffer} from '../file-transformer';

const HIGH_RES_IMG_CONVERSION_WIDTH = 1024;
const HIGH_RES_IMG_CONVERSION_HEIGHT = 1024;
const HIGH_RES_IMG_CONVERSION_QUALITY = 55;

const LOW_RES_IMG_CONVERSION_WIDTH = 200;
const LOW_RES_IMG_CONVERSION_HEIGHT = 200;
const LOW_RES_IMG_CONVERSION_QUALITY = 55;


const fetchImage = async (url: string) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - native fetch is not defined in NodeJS yet
  const response = await fetch(url, {
    method: 'GET',
  });

  return response.buffer();
};

export const writeImageURL = async (
  objectType: ObjectTypes,
  url: string,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const buffer = await fetchImage(url);

  return writeImageBuffer(objectType, buffer, highResConversion);
};

export const writeImageFile = async (
  objectType: ObjectTypes,
  filePath: string,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const buffer = await fs.readFile(filePath);

  return writeImageBuffer(objectType, buffer, highResConversion);
};

export const writeImageBuffer = async (
  objectType: ObjectTypes,
  buffer: Buffer,
  highResConversion: boolean,
): Promise<StorageObjectRecord> => {
  const height = highResConversion ? HIGH_RES_IMG_CONVERSION_HEIGHT : LOW_RES_IMG_CONVERSION_HEIGHT;
  const width = highResConversion ? HIGH_RES_IMG_CONVERSION_WIDTH : LOW_RES_IMG_CONVERSION_WIDTH;
  const quality = highResConversion ? HIGH_RES_IMG_CONVERSION_QUALITY : LOW_RES_IMG_CONVERSION_QUALITY;

  const converted = await transformImageBuffer(
    buffer,
    width,
    height,
    quality,
    highResConversion ? 'inside' : 'cover',
  );

  const result = await writeBuffer(
    objectType,
    converted,
    'image/jpeg'
  );

  return result;
};

