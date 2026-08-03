import type { NextFunction, Request, Response } from "express";
// We import multer to mutate the express Request/Response types
import "multer";
import { unlink } from "fs/promises";
import * as Sentry from "@sentry/node";

const cleanupFile = (file: Express.Multer.File | undefined) => {
  if (!file?.path) return;

  unlink(file.path).catch((e) => {
    if (e instanceof Error && "code" in e && e.code === "ENOENT") return;

    Sentry.captureException(e);
  });
};

export function multerAutoCleanup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("close", () => {
    cleanupFile(req.file);

    const files = req.files;
    if (typeof files != "undefined") {
      if (Array.isArray(files)) {
        files.forEach((file) => cleanupFile(file));
      } else {
        Object.keys(files).forEach((key) => {
          const keyFiles = files[key];
          if (Array.isArray(keyFiles)) {
            keyFiles.forEach((file) => cleanupFile(file));
          }
        });
      }
    }
  });

  next();
}
