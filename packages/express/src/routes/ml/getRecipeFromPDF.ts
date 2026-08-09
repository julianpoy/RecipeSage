import { BadRequestError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import multer from "multer";
import { multerAutoCleanup } from "@recipesage/util/server/general";
import { tmpdir } from "os";
import { pdfToRecipe } from "@recipesage/util/server/ml";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { assertCreditsAvailableExpress } from "../../util/assertCreditsAvailableExpress";
import { handleUploadErrors } from "../../util/handleUploadErrors";
import { standardizedRecipeImportEntryForWebSchema } from "@recipesage/prisma";

const FILE_SIZE_LIMIT_MB = 50;

const schema = {
  response: standardizedRecipeImportEntryForWebSchema,
};

export const getRecipeFromPDFHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    openapi: {
      method: "post",
      path: "/ml/getRecipeFromPDF",
      tags: ["ml"],
      summary: "Recognize a recipe from a PDF file",
      upload: {
        field: "file",
      },
    },
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
    const userId = res.locals.session.userId;

    await assertCreditsAvailableExpress(userId, "mlPdf");

    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const recognizedRecipe = await pdfToRecipe(file.path);
    if (!recognizedRecipe) {
      throw new BadRequestError("Could not parse recipe from OCR results");
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(userId, "mlPdf");
    }

    return {
      data: recognizedRecipe,
      statusCode: 200,
    };
  },
);
