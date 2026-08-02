import type { Handler } from "express";
import multer from "multer";
import { BadRequestError, PayloadTooLargeError } from "../errors";

export const handleUploadErrors = (upload: Handler): Handler => {
  return (req, res, next) => {
    upload(req, res, (error?: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(new PayloadTooLargeError(error.message));
        } else {
          next(new BadRequestError(error.message));
        }
        return;
      }

      next(error);
    });
  };
};
