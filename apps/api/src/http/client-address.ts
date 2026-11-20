import { isIP } from "node:net";
import { Address6 } from "ip-address";

const mappedIPv4 = new Address6("::ffff:0:0/96");

export function clientAddress(request: Request, trustProxy: boolean) {
  const forwarded = trustProxy
    ? (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for"))
    : null;
  const peer = "ip" in request && typeof request.ip === "string" ? request.ip : undefined;
  // Only accept one unscoped address from a proxy that replaces the header.
  const address = forwarded && !forwarded.includes("%") && isIP(forwarded) ? forwarded : peer;
  if (!address) return;

  const family = isIP(address);
  if (family === 4) return address;
  if (family !== 6) return;

  const ipv6 = new Address6(address);
  if (ipv6.isInSubnet(mappedIPv4)) return ipv6.to4().correctForm();
  return new Address6(`${ipv6.correctForm()}/64`).startAddress().correctForm();
}
