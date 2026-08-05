import { readStream, ObjectTypes } from "../../../../../storage/index";
import { createWriteStream } from "fs";
import { mkdtempDisposable } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

export async function downloadS3ToTemp(
  key: string,
): Promise<{ filePath: string } & AsyncDisposable> {
  const tempDir = await mkdtempDisposable("/tmp/");

  try {
    const filePath = path.join(tempDir.path, "downloadedBlob");

    const sourceStream = await readStream(ObjectTypes.IMPORT_DATA, key);
    const fileStream = createWriteStream(filePath);

    await pipeline(sourceStream, fileStream);

    return {
      filePath,
      [Symbol.asyncDispose]: () => tempDir.remove(),
    };
  } catch (e) {
    try {
      await tempDir.remove();
    } catch (removeError) {
      console.error(removeError);
    }
    throw e;
  }
}
