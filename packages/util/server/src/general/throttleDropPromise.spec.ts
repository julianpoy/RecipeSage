import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { throttleDropPromise } from "./throttleDropPromise";

describe("throttleDropPromise", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls through immediately on the first call", async () => {
    const cb = vi.fn();
    const throttled = throttleDropPromise(cb, 100);

    await throttled("first");

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith("first");
  });

  it("replays only the most recent dropped call once the window elapses", async () => {
    const cb = vi.fn();
    const throttled = throttleDropPromise(cb, 100);

    await throttled("first");
    await throttled("second");
    await throttled("third");

    expect(cb).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith("third");
  });

  it("does not keep firing once the trailing call has been replayed", async () => {
    const cb = vi.fn();
    const throttled = throttleDropPromise(cb, 100);

    await throttled("first");
    await throttled("second");

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("keeps working after the wrapped function rejects", async () => {
    const cb = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const throttled = throttleDropPromise(cb, 100);

    await throttled("first");
    await vi.advanceTimersByTimeAsync(100);

    await throttled("second");

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith("second");
  });

  it("keeps working after the wrapped function throws synchronously", async () => {
    const cb = vi.fn().mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const throttled = throttleDropPromise(cb, 100);

    await throttled("first");
    await vi.advanceTimersByTimeAsync(100);

    await throttled("second");

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith("second");
  });
});
