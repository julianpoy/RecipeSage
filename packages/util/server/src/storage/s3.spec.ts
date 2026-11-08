import { describe, it, expect, beforeEach, vi } from "vitest";
import { deleteObjects } from "./s3";
import { ObjectTypes } from "./shared";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  S3Client: class {
    send = sendMock;
  },
}));

describe("deleteObjects", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("sends pages of at most 1000 keys one at a time", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    sendMock.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return {};
    });

    const keys = Array.from({ length: 2500 }, (_, idx) => `key-${idx}`);

    await deleteObjects(ObjectTypes.RECIPE_IMAGE, keys);

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
  });

  it("returns the keys S3 reports as failed", async () => {
    sendMock.mockResolvedValue({
      Errors: [{ Key: "b", Code: "SlowDown" }],
    });

    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, [
      "a",
      "b",
    ]);

    expect(failedKeys).toEqual(["b"]);
  });

  it("returns no keys when every key is deleted", async () => {
    sendMock.mockResolvedValue({});

    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, ["a"]);

    expect(failedKeys).toEqual([]);
  });

  it("throws when a request fails", async () => {
    sendMock.mockRejectedValue(new Error("SlowDown"));

    await expect(
      deleteObjects(ObjectTypes.RECIPE_IMAGE, ["a"]),
    ).rejects.toThrow("SlowDown");
  });
});
