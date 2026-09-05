export class ScrapflyError extends Error {
  status: number;

  constructor(status: number) {
    super(`Scrapfly fetch failed: ${status}`);
    this.name = "ScrapflyError";
    this.status = status;
  }
}
