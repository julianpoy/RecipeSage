import { RequestHandler } from "express";

export const wrapRequestWithErrorHandler = (
  handler: (...args: Parameters<RequestHandler>) => Promise<void>,
): RequestHandler => {
  const wrapper: RequestHandler = async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (e) {
      next(e);
    }
  };
  return wrapper;
};
