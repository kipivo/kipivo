import { expect, test } from "bun:test";
import { parseWorkspaceOrigin } from "./address.ts";

test("normalizes a public HTTPS origin", () => {
  expect(parseWorkspaceOrigin(" https://Kipivo.example:443/ ", false)).toBe(
    "https://kipivo.example",
  );
  expect(parseWorkspaceOrigin("https://kipivo.example:8443", false)).toBe(
    "https://kipivo.example:8443",
  );
});

test.each([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://[::1]:3000",
  "http://10.0.2.2:3000",
  "http://172.31.0.3:3000",
  "http://192.168.0.3:3000",
])("accepts %s only in development", (address) => {
  expect(parseWorkspaceOrigin(address, true)).toBe(address);
  expect(parseWorkspaceOrigin(address, false)).toBeNull();
});

test.each([
  "",
  "kipivo.example",
  "//kipivo.example",
  "file:///tmp/index.html",
  "javascript:alert(1)",
  "https:///kipivo.example",
  "https://kipivo..example",
  "https://kipivo.example:99999",
  "https://kipivo.example/.",
  "https://kipivo.example?",
  "https://kipivo.example#",
  "https://kipivo.example\\@another.example",
  "https://alice:secret@kipivo.example",
  "https://@kipivo.example",
  "http://localhost.kipivo.example",
  "http://192.168.0.3.kipivo.example",
  "http://172.32.0.3:3000",
  "http://kipivo.example",
])("rejects %j even in development", (address) => {
  expect(parseWorkspaceOrigin(address, true)).toBeNull();
});
