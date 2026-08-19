import { BadRequestError, UnsupportedMediaTypeError } from "../../errors";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import * as Sentry from "@sentry/node";
import multer from "multer";
import {
  FileTransformError,
  multerAutoCleanup,
} from "@recipesage/util/server/general";
import { ObjectTypes, writeImageFile } from "@recipesage/util/server/storage";
import { tmpdir } from "os";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { imageSummary, prisma, type ImageSummary } from "@recipesage/prisma";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { handleUploadErrors } from "../../util/handleUploadErrors";

const FILE_SIZE_LIMIT_MB = 40;

const schema = {};

export const createRecipeImageHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multerAutoCleanup,
      handleUploadErrors(
        multer({
          storage: multer.diskStorage({
            destination: tmpdir(),
          }),
          limits: {
            fileSize: FILE_SIZE_LIMIT_MB * 1024 * 1024,
          },
        }).single("file"),
      ),
    ],
  },
  async (req, res) => {
    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const encodeInHighRes = await userHasCapability(
      res.locals.session.userId,
      Capabilities.HighResImages,
    );

    let storedFile;
    try {
      storedFile = await writeImageFile(
        ObjectTypes.RECIPE_IMAGE,
        file.path,
        encodeInHighRes,
        tmpdir(),
      );
    } catch (e) {
      if (!(e instanceof FileTransformError)) {
        Sentry.captureException(e);
      }
      throw new UnsupportedMediaTypeError();
    }

    const image = await prisma.image.create({
      data: {
        userId: res.locals.session.userId,
        location: storedFile.location,
        key: storedFile.key,
        json: storedFile as unknown as InputJsonValue,
      },
      ...imageSummary,
    });

    return {
      statusCode: 201,
      data: image satisfies ImageSummary,
    };
  },
);
