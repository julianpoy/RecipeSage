import path from "node:path";
import { randomBytes } from "node:crypto";
import { BadRequestError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import multer from "multer";
import {
  multerAutoCleanup,
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
  isExtractableDocumentExtension,
  ExtractTextFromDocumentError,
} from "@recipesage/util/server/general";
import { tmpdir } from "os";
import { documentToRecipe } from "@recipesage/util/server/ml";
import { assertCreditsAvailableExpress } from "../../util/assertCreditsAvailableExpress";

const FILE_SIZE_LIMIT_MB = 50;

const schema = {};

export const getRecipeFromDocumentHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multerAutoCleanup,
      multer({
        storage: multer.diskStorage({
          destination: tmpdir(),
          filename: (_req, file, cb) => {
            const extension = path.extname(file.originalname).toLowerCase();
            cb(null, `${randomBytes(16).toString("hex")}${extension}`);
          },
        }),
        limits: {
          fileSize: FILE_SIZE_LIMIT_MB * 1024 * 1024,
        },
      }).single("file"),
    ],
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    await assertCreditsAvailableExpress(userId, "mlDocument");

    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== ".txt" && !isExtractableDocumentExtension(extension)) {
      throw new BadRequestError(`Unsupported document extension: ${extension}`);
    }

    let recognizedRecipe;
    try {
      recognizedRecipe = await documentToRecipe(file.path);
    } catch (e) {
      if (e instanceof ExtractTextFromDocumentError) {
        throw new BadRequestError("Failed to extract text from document");
      }
      throw e;
    }
    if (!recognizedRecipe) {
      throw new BadRequestError("Could not parse recipe from document");
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(userId, "mlDocument");
    }

    return {
      data: recognizedRecipe,
      statusCode: 200,
    };
  },
);
