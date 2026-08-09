export class FetchURLError extends Error {
  constructor(url: string) {
    super(`Invalid fetch URL: ${url}`);
    this.name = "FetchURLError";
  }
}
