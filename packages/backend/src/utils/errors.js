const constructError = (message, status) => {
  const e = new Error(message);
  e.status = status;
  return e;
};
// 4xx
export const BadRequest = (message) => constructError(message, 400);
export const Unauthorized = (message) => constructError(message, 401);
export const Forbidden = (message) => constructError(message, 403);
export const NotFound = (message) => constructError(message, 404);
export const Conflict = (message) => constructError(message, 409);
export const PreconditionFailed = (message) => constructError(message, 412);
export const UnsupportedMediaType = (message) => constructError(message, 415);
// 5xx
export const InternalServerError = (message) => constructError(message, 500);
