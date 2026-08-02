export class ServerError extends Error {
  constructor(
    public status: number,
    ...args: ConstructorParameters<typeof Error>
  ) {
    super(...args);
  }
}

export class BadRequestError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(400, ...args);
  }
}

export class UnauthorizedError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(401, ...args);
  }
}

export class ForbiddenError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(403, ...args);
  }
}

export class NotFoundError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(404, ...args);
  }
}

export class NotAcceptableError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(406, ...args);
  }
}

export class PayloadTooLargeError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(413, ...args);
  }
}

export class UnsupportedMediaTypeError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(415, ...args);
  }
}

export class TooManyRequestsError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(429, ...args);
  }
}

export class CreditLimitExceededHttpError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(420, ...args);
  }
}

export class InternalServerError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(500, ...args);
  }
}
