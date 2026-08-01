export class ImageFetchError extends Error {
  status: number;

  constructor(status: number) {
    super(`Could not fetch image: ${status}`);
    this.name = "ImageFetchError";
    this.status = status;
  }
}
