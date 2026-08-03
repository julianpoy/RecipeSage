import { BadRequestError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import multer from "multer";
import { multerAutoCleanup } from "@recipesage/util/server/general";
import { tmpdir } from "os";
import { ocrImagesToRecipe } from "@recipesage/util/server/ml";
import { createReadStream } from "fs";
import type { StandardizedRecipeImportEntryForWeb } from "@recipesage/prisma";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { assertCreditsAvailableExpress } from "../../util/assertCreditsAvailableExpress";
import { handleUploadErrors } from "../../util/handleUploadErrors";

const FILE_SIZE_LIMIT_MB = 50;

const schema = {};

export const getRecipeFromOCRHandler = defineHandler(
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
            files: 5,
          },
        }).array("file"),
      ),
    ],
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    await assertCreditsAvailableExpress(userId, "mlOcr");

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files) {
      throw new BadRequestError(
        "Request must include multipart files under the 'file' field",
      );
    }

    const recognizedRecipe = await ocrImagesToRecipe(
      files.map((file) => createReadStream(file.path)),
    );
    if (!recognizedRecipe) {
      throw new BadRequestError("Could not parse recipe from OCR results");
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(userId, "mlOcr");
    }

    return {
      data: recognizedRecipe as StandardizedRecipeImportEntryForWeb,
      statusCode: 200,
    };
  },
);
