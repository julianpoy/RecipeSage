import { describe, it, expect, beforeEach, vi } from "vitest";
import { enqueueImageDeletion } from "./enqueueImageDeletion";

const { addBulkMock } = vi.hoisted(() => ({
  addBulkMock: vi.fn(),
}));

vi.mock("bullmq", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Queue: class {
    addBulk = addBulkMock;
    on = vi.fn();
  },
}));

const enqueuedImageIds = () =>
  addBulkMock.mock.calls[0][0].map(
    (job: { data: { imageIds: string[] } }) => job.data.imageIds,
  );

describe("enqueueImageDeletion", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

  it("splits image ids into jobs of at most 500", async () => {
    const imageIds = Array.from({ length: 1200 }, (_, idx) => `image-${idx}`);

    await enqueueImageDeletion(imageIds, "user-id");

    const jobImageIds = enqueuedImageIds();
    expect(jobImageIds.map((ids: string[]) => ids.length)).toEqual([
      500, 500, 200,
    ]);
    expect(addBulkMock.mock.calls[0][0][0].data.imageOwnerUserId).toEqual(
      "user-id",
    );
  });

  it("removes duplicate image ids", async () => {
    await enqueueImageDeletion(["a", "a", "b"], null);

    expect(enqueuedImageIds()).toEqual([["a", "b"]]);
  });

  it("does not enqueue anything when there are no image ids", async () => {
    await enqueueImageDeletion([], null);

    expect(addBulkMock).not.toHaveBeenCalled();
  });

  it("throws when the queue is unavailable", async () => {
    addBulkMock.mockRejectedValue(new Error("Connection is closed"));

    await expect(enqueueImageDeletion(["a"], null)).rejects.toThrow(
      "Connection is closed",
    );
  });
});
