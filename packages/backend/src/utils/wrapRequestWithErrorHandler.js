export const wrapRequestWithErrorHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch(e) {
      next(e);
    }
  };
};

