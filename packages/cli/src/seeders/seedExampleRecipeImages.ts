import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@recipesage/prisma";
import { writeBuffer, ObjectTypes } from "@recipesage/util/server/storage";
import { exampleRecipeDefinitions } from "@recipesage/util/server/db";

const IMAGES_DIR = join(__dirname, "assets", "exampleRecipeImages");

export const seedExampleRecipeImages = async () => {
  const images = exampleRecipeDefinitions.flatMap(
    (definition) => definition.images,
  );

  for (const image of images) {
    const existing = await prisma.image.findUnique({
      where: {
        id: image.id,
      },
    });
    if (existing) continue;

    const buffer = await readFile(join(IMAGES_DIR, image.fileName));
    const storedFile = await writeBuffer(
      ObjectTypes.RECIPE_IMAGE,
      buffer,
      "image/jpeg",
    );

    await prisma.image.create({
      data: {
        id: image.id,
        userId: null,
        location: storedFile.location,
        key: storedFile.key,
        json: {
          objectType: storedFile.objectType,
          mimetype: storedFile.mimetype,
          size: storedFile.size,
          bucket: storedFile.bucket,
          key: storedFile.key,
          acl: storedFile.acl ?? null,
          location: storedFile.location,
          etag: storedFile.etag,
        },
      },
    });
  }
};
