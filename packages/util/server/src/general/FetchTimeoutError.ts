export class FetchTimeoutError extends Error {
  constructor(url: string) {
    super(`Timed out fetching URL: ${url}`);
    this.name = "FetchTimeoutError";
  }
}
