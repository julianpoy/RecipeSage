import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { deleteObjects } from "./firebase";
import { ObjectTypes } from "./shared";

const { deleteMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({
      file: (key: string) => ({
        delete: (options: unknown) => deleteMock(key, options),
      }),
    }),
  }),
}));

describe("deleteObjects", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns no keys when every key is deleted", async () => {
    deleteMock.mockResolvedValue(undefined);

    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, [
      "a",
      "b",
    ]);

    expect(deleteMock).toHaveBeenCalledWith("a", { ignoreNotFound: true });
    expect(deleteMock).toHaveBeenCalledWith("b", { ignoreNotFound: true });
    expect(failedKeys).toEqual([]);
  });

  it("returns the keys that failed to delete", async () => {
    deleteMock.mockImplementation(async (key: string) => {
      if (key === "b") throw new Error("Service unavailable");
    });

    const failedKeys = await deleteObjects(ObjectTypes.RECIPE_IMAGE, [
      "a",
      "b",
    ]);

    expect(failedKeys).toEqual(["b"]);
  });
});
