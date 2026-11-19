import { expect, it } from "vitest";
import { createEmailConfig, redactEmailSettings } from "./config";
const initial = { enabled: false, from: null, sealedKey: null };
const input = { enabled: true, from: "sender@example.com", apiKey: "original-key" };
it("keeps credentials write-only and supports disable, replace and remove", () => {
  const config = createEmailConfig("test-secret");
  expect(config.update(initial, { ...input, apiKey: undefined })).toBeNull();
  const saved = config.update(initial, input)!;
  expect(redactEmailSettings(saved)).toEqual({ enabled: true, from: input.from, hasApiKey: true });
  expect(saved.sealedKey).not.toBe(input.apiKey);
  const disabled = config.update(saved, { enabled: false, from: input.from })!;
  expect(config.delivery(disabled)).toBeNull();
  const restored = config.update(disabled, { enabled: true, from: input.from })!;
  expect(config.delivery(restored)?.apiKey).toBe(input.apiKey);
  expect(config.delivery(config.update(saved, { ...input, apiKey: "new-key" })!)?.apiKey).toBe(
    "new-key",
  );
  expect(config.update(saved, { ...input, apiKey: null })).toBeNull();
  expect(config.update(saved, { apiKey: null, from: null, enabled: false })).toEqual(initial);
});
it("does not decrypt with a different deployment secret", () => {
  const saved = createEmailConfig("secret-one").update(initial, input)!;
  expect(() => createEmailConfig("secret-two").delivery(saved)).toThrow();
});
