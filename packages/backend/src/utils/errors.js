const constructError = (message, status) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

// 4xx
const BadRequest = (message) => constructError(message, 400);
const Unauthorized = (message) => constructError(message, 401);
const Forbidden = (message) => constructError(message, 403);
const NotFound = (message) => constructError(message, 404);
const Conflict = (message) => constructError(message, 409);
const PreconditionFailed = (message) => constructError(message, 412);
const UnsupportedMediaType = (message) => constructError(message, 415);

// 5xx
const InternalServerError = (message) => constructError(message, 500);

module.exports = {
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  PreconditionFailed,
  UnsupportedMediaType,
  InternalServerError,
};

