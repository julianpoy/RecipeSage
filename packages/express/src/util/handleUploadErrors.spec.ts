import { describe, it, expect, vi } from "vitest";
import express, {
  type ErrorRequestHandler,
  type Handler,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import request from "supertest";
import { tmpdir } from "os";
import { handleUploadErrors } from "./handleUploadErrors";
import { BadRequestError, PayloadTooLargeError, ServerError } from "../errors";

const buildApp = (upload: Handler) => {
  const app = express();
  const errors: Error[] = [];

  app.post("/upload", handleUploadErrors(upload), (req, res) => {
    res.status(200).send(req.file?.originalname || "no file");
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    errors.push(error);
    res
      .status(error instanceof ServerError ? error.status : 500)
      .send(error.name);
  };
  app.use(errorHandler);

  return { app, errors };
};

const uploadWithLimits = (limits: multer.Options["limits"]) =>
  multer({
    storage: multer.diskStorage({ destination: tmpdir() }),
    limits,
  }).single("file");

const invokeWith = (error?: unknown) => {
  const next = vi.fn();
  const upload: Handler = (_req, _res, done) => done(error);

  handleUploadErrors(upload)({} as Request, {} as Response, next);

  return next;
};

describe("handleUploadErrors", () => {
  describe("through a real upload", () => {
    it("passes an upload within the limit through to the handler", async () => {
      const { app, errors } = buildApp(uploadWithLimits({ fileSize: 1024 }));

      const response = await request(app)
        .post("/upload")
        .attach("file", Buffer.alloc(512), "recipes.json");

      expect(response.status).toEqual(200);
      expect(response.text).toEqual("recipes.json");
      expect(errors).toEqual([]);
    });

    it("rejects an upload over the size limit as 413", async () => {
      const { app, errors } = buildApp(uploadWithLimits({ fileSize: 1024 }));

      const response = await request(app)
        .post("/upload")
        .attach("file", Buffer.alloc(4096), "recipes.json");

      expect(response.status).toEqual(413);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(PayloadTooLargeError);
      expect(errors[0]).toMatchObject({ status: 413 });
    });

    it("rejects an upload of an unexpected field as 400", async () => {
      const { app, errors } = buildApp(uploadWithLimits({ fileSize: 1024 }));

      const response = await request(app)
        .post("/upload")
        .attach("unexpected", Buffer.alloc(16), "recipes.json");

      expect(response.status).toEqual(400);
      expect(errors[0]).toBeInstanceOf(BadRequestError);
      expect(errors[0]).toMatchObject({ status: 400 });
    });

    it("rejects an upload of too many files as 400", async () => {
      const { app, errors } = buildApp(
        multer({
          storage: multer.diskStorage({ destination: tmpdir() }),
          limits: { files: 1 },
        }).array("file"),
      );

      const response = await request(app)
        .post("/upload")
        .attach("file", Buffer.alloc(16), "one.json")
        .attach("file", Buffer.alloc(16), "two.json");

      expect(response.status).toEqual(400);
      expect(errors[0]).toBeInstanceOf(BadRequestError);
      expect(errors[0]).toMatchObject({ status: 400 });
    });

    it("leaves non-multer errors untouched", async () => {
      const boom = new Error("boom");
      const { app, errors } = buildApp((_req, _res, next) => next(boom));

      const response = await request(app).post("/upload");

      expect(response.status).toEqual(500);
      expect(errors).toEqual([boom]);
    });
  });

  describe("passing the error along", () => {
    it("continues exactly once for an oversized upload", () => {
      const next = invokeWith(new multer.MulterError("LIMIT_FILE_SIZE"));

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("keeps multer's explanation on the converted error", () => {
      const multerError = new multer.MulterError("LIMIT_FILE_SIZE");
      const next = invokeWith(multerError);

      expect(next.mock.calls[0][0]).toMatchObject({
        message: multerError.message,
      });
      expect(multerError.message).not.toEqual("");
    });

    it("only converts errors that came from multer", () => {
      const impostor = Object.assign(new Error("not from multer"), {
        code: "LIMIT_FILE_SIZE",
      });
      const next = invokeWith(impostor);

      expect(next.mock.calls).toEqual([[impostor]]);
    });

    it("continues with no error when the upload succeeds", () => {
      const next = invokeWith();

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(undefined);
    });
  });
});
