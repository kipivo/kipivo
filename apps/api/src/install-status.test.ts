import { describe, expect, it, vi } from "vitest";
import { cachedInstallStatus } from "./install-status";

describe("installation route cache", () => {
  const cacheStub = () => ({ getJson: vi.fn(), setJson: vi.fn() });
  it("only stores closure and lets a second replica use it", async () => {
    const cache = cacheStub();
    const read = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(false);
    const status = cachedInstallStatus(read, cache, "db", "secret");
    expect(await status()).toBe(true);
    expect(await status()).toBeUndefined();
    expect(cache.setJson).not.toHaveBeenCalled();
    expect(await status()).toBe(false);
    const [key] = cache.getJson.mock.calls[0]!;
    expect(cache.setJson).toHaveBeenCalledWith(key, "closed", 60);
    cache.getJson.mockImplementation(async (k: string) => (k === key ? "closed" : null));
    expect(await cachedInstallStatus(read, cache, "db", "secret")()).toBe(false);
    expect(read).toHaveBeenCalledTimes(3);
    read.mockResolvedValue(true);
    expect(await cachedInstallStatus(read, cache, "another db", "secret")()).toBe(true);
  });
  it("falls back on Redis failure, corrupt entries and slow reads/writes", async () => {
    const read = vi.fn(async () => false);
    const cache = cacheStub();
    const status = cachedInstallStatus(read, cache, "db", "secret");
    cache.getJson.mockRejectedValueOnce(new Error()).mockResolvedValueOnce({ open: false });
    cache.setJson.mockRejectedValue(new Error());
    expect(await status()).toBe(false);
    expect(await status()).toBe(false);
    vi.useFakeTimers();
    try {
      cache.getJson.mockReturnValue(new Promise(() => {}));
      cache.setJson.mockReturnValue(new Promise(() => {}));
      const slow = status();
      await vi.advanceTimersByTimeAsync(250);
      expect(await slow).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    expect(read).toHaveBeenCalledTimes(3);
  });
});
