const originShape = /^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:.]+\])(?::\d{1,5})?\/?$/i;
const hostnameShape =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.?$/;

function isLocalHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  if (!/^(\d+\.){3}\d+$/.test(hostname)) return false;
  const [a, b] = hostname.split(".").map(Number);
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function parseWorkspaceOrigin(value: string, development: boolean): string | null {
  const address = value.trim();
  // Reject credentials, paths and URL parser shortcuts before normalizing the origin.
  if (!originShape.test(address)) return null;

  try {
    const { origin, protocol, hostname } = new URL(address);
    if (!hostname.startsWith("[") && (hostname.length > 254 || !hostnameShape.test(hostname))) {
      return null;
    }
    if (protocol === "https:" || (development && isLocalHostname(hostname))) return origin;
  } catch {
    // Malformed host or port.
  }
  return null;
}
