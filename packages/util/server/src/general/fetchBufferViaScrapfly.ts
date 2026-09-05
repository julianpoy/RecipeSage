import { z } from "zod";
import { fetchURL } from "./fetch";
import { ScrapflyError } from "./ScrapflyError";

const SCRAPFLY_TIMEOUT_SECONDS = 15;

const scrapflyResponseSchema = z.object({
  result: z.object({
    status_code: z.number(),
    format: z.string().optional(),
    content: z.string().optional(),
  }),
});

export const fetchBufferViaScrapfly = async (url: string): Promise<Buffer> => {
  const key = process.env.SCRAPFLY_API_KEY;
  if (!key) throw new ScrapflyError(0);

  const params = new URLSearchParams({ asp: "true", key, url });
  const apiURL = `https://api.scrapfly.io/scrape?${params}`;

  const response = await fetchURL(apiURL, {
    timeout: SCRAPFLY_TIMEOUT_SECONDS * 1000,
  });

  if (response.status !== 200) throw new ScrapflyError(response.status);

  const parsed = scrapflyResponseSchema.parse(await response.json());
  const { status_code: statusCode, format, content } = parsed.result;

  if (statusCode !== 200 || !content) throw new ScrapflyError(statusCode);

  const buffer =
    format === "binary" ? Buffer.from(content, "base64") : Buffer.from(content);

  return buffer;
};
