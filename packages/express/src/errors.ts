
export class ServerError extends Error {
  constructor(
    public status: number,
    ...args: ConstructorParameters<typeof Error>
  ) {
    super(...args);
  }
}

export class NotFoundError extends ServerError {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(404, ...args);
  }
}
