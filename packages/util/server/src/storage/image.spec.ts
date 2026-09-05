import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Response, FetchError } from "node-fetch";
import { Readable } from "stream";
import { fetchURL, fetchBufferViaScrapfly, ScrapflyError } from "../general";
import { writeBuffer } from "./index";
import { writeImageURL } from "./image";
import { ObjectTypes } from "./shared";
import { ImageFetchError } from "./imageFetchError";

vi.mock("../general/fetch", () => ({ fetchURL: vi.fn() }));
vi.mock("../general/fetchBufferViaScrapfly", () => ({
  fetchBufferViaScrapfly: vi.fn(),
}));
vi.mock("../general/fileTransformer", () => ({
  transformImageBuffer: vi.fn(async () => Buffer.from("converted-image")),
}));

vi.mock("./index", () => ({
  writeBuffer: vi.fn(async () => ({
    objectType: ObjectTypes.RECIPE_IMAGE,
    mimetype: "image/jpeg",
    size: "123",
    bucket: "bucket",
    key: "key",
    acl: undefined,
    location: "location",
    etag: "etag",
  })),
}));

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe("writeImageURL", () => {
  beforeEach(() => {
    vi.mocked(fetchURL).mockReset();
    vi.mocked(fetchBufferViaScrapfly).mockReset();
    vi.mocked(writeBuffer).mockClear();
    vi.stubEnv("SCRAPFLY_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores the image directly on a 200 without falling back to Scrapfly", async () => {
    vi.mocked(fetchURL).mockResolvedValue(new Response(PNG, { status: 200 }));

    await writeImageURL(ObjectTypes.RECIPE_IMAGE, "https://x/img.jpg", true);

    expect(vi.mocked(writeBuffer)).toHaveBeenCalledOnce();
    expect(vi.mocked(fetchBufferViaScrapfly)).not.toHaveBeenCalled();
  });

  it("falls back to Scrapfly on a 403 when a Scrapfly key is set", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "test-key");
    vi.mocked(fetchURL).mockResolvedValue(new Response(null, { status: 403 }));
    vi.mocked(fetchBufferViaScrapfly).mockResolvedValue(PNG);

    await writeImageURL(ObjectTypes.RECIPE_IMAGE, "https://x/img.jpg", true);

    expect(vi.mocked(fetchBufferViaScrapfly)).toHaveBeenCalledOnce();
    expect(vi.mocked(writeBuffer)).toHaveBeenCalledOnce();
  });

  it("does not fall back to Scrapfly on a 403 when no key is set", async () => {
    vi.mocked(fetchURL).mockResolvedValue(new Response(null, { status: 403 }));

    await expect(
      writeImageURL(ObjectTypes.RECIPE_IMAGE, "https://x/img.jpg", true),
    ).rejects.toBeInstanceOf(ImageFetchError);
    expect(vi.mocked(fetchBufferViaScrapfly)).not.toHaveBeenCalled();
  });

  it("does not fall back to Scrapfly on a non-anti-bot status", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "test-key");
    vi.mocked(fetchURL).mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      writeImageURL(ObjectTypes.RECIPE_IMAGE, "https://x/img.jpg", true),
    ).rejects.toBeInstanceOf(ImageFetchError);
    expect(vi.mocked(fetchBufferViaScrapfly)).not.toHaveBeenCalled();
  });

  it("propagates a Scrapfly failure", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "test-key");
    vi.mocked(fetchURL).mockResolvedValue(new Response(null, { status: 403 }));
    vi.mocked(fetchBufferViaScrapfly).mockRejectedValue(new ScrapflyError(403));

    await expect(
      writeImageURL(ObjectTypes.RECIPE_IMAGE, "https://x/img.jpg", true),
    ).rejects.toBeInstanceOf(ScrapflyError);
  });

  it("propagates an error thrown while reading the image body", async () => {
    const body = new Readable({
      read() {
        this.destroy(new FetchError("content size over limit", "max-size"));
      },
    });
    vi.mocked(fetchURL).mockResolvedValue(new Response(body, { status: 200 }));

    await expect(
      writeImageURL(ObjectTypes.RECIPE_IMAGE, "https://x/img.jpg", true),
    ).rejects.toThrow("content size over limit");
  });
});
