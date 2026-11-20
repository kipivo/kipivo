# Kipivo mobile

The iOS and Android app opens your Kipivo Web workspace in the browser, where sign-in and work happen. On **Connection**, you can set the Web address and run an unauthenticated `GET /api/v1/system/ping`. The check expects HTTP 200 with JSON `{ "ok": true }`. It only verifies API connectivity from the device; it does not verify sign-in, the database, or service readiness. You can open the workspace without running the check or after a failed check.

## Configure the address

Use your Kipivo **Web or gateway origin**, not a separate API hostname. Include the scheme and, if needed, the port. Don’t include a path, query, fragment, credentials, or tokens. Production builds require HTTPS.

- **On the device:** Choose **Set workspace address** or **Connection settings → Change address**. Nothing is saved to device storage; the change lasts for the current app session.
- **Default for development or builds:** Put `EXPO_PUBLIC_KIPIVO_URL=https://<your-kipivo-host>` in an ignored `apps/mobile/.env.local`, replacing the placeholder with your Web origin. The value is optional and is embedded in the bundle, so never put secrets in it. Reload the app after changing it during development; rebuild a production bundle to change its default.

## Run in Expo Go

Run these commands from the repository root with the Bun version specified in the [repository guide](../../README.md#development).

```sh
bun install --frozen-lockfile
bun run dev:mobile
```

Scan Expo’s QR code on a phone with an Expo Go version compatible with this workspace’s Expo SDK, or press `i` or `a` for an installed iOS simulator or Android emulator. If Expo Go for your device does not support the SDK, use a native development build instead. A missing default address does not require a rebuild: enter your workspace address in the app.

### Connect to Kipivo running locally

Start the local API and Web services as described in the [development guide](../../README.md#development) and [database and authentication guide](../../docs/auth.md). For a physical device, start Web on a LAN interface with `bun run --cwd apps/web dev --host 0.0.0.0`. Use the Web port (`3000` by default), not the separate API port. The computer and phone must be on the same reachable network, and the computer’s firewall must allow the connections to Web and Expo’s development server. An Expo tunnel connects your device to Metro, not to your local Web server.

Development mode accepts HTTP for loopback and private IPv4 addresses. For the iOS simulator, use `http://localhost:3000`; for the Android emulator, use `http://10.0.2.2:3000` with the development host reachable there. On a physical device, use the computer’s private LAN IP and Web port; `localhost` on the phone points back to the phone. If device permissions or platform cleartext policies block local traffic, grant local-network access where applicable or use a Web endpoint with trusted HTTPS. Release builds do not permit HTTP addresses.

To sign in from the device’s browser, set `AUTH_URL` on the API server to the same Web origin the device uses (same scheme, hostname or IP, and port), then restart the API. If the phone uses a LAN IP, an API configured for `localhost` may pass the ping check but won’t accept sign-in from the LAN origin.

## Export, build, and test

- `bun run build --filter=mobile` verifies that Metro can export both iOS and Android bundles to `apps/mobile/dist`. Supply `EXPO_PUBLIC_KIPIVO_URL` in the shell environment or `apps/mobile/.env.local` to embed a default address.
- An export is not an installable app. With Xcode or the Android SDK set up, use `bun run --cwd apps/mobile expo run:ios` or `bun run --cwd apps/mobile expo run:android` for a local native development build. Physical iOS builds also require signing. Keep generated `ios/` and `android/` files out of version control.
- `bun run test --filter=mobile` runs the address and connection tests without a device or a live backend.
