import { BadRequestError } from "../../../errors";
import { importInstantRouter } from ".";
import {
  extractTextFromPDF,
  wrapRequestWithErrorHandler,
} from "@recipesage/util/server";
import * as multer from "multer";

importInstantRouter.get(
  "/pdf",
  multer({ storage: multer.memoryStorage() }).single("file"),
  wrapRequestWithErrorHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "You must provide a file as part of your request",
      );
    }

    const text = await extractTextFromPDF(file.buffer);

    // const recipe = await
    //
    res.status(200).send(text);
  }),
);
