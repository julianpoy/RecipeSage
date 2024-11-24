import { gunzip, InputType } from "zlib";

export const gunzipPromise = (buf: InputType): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    gunzip(buf, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};
