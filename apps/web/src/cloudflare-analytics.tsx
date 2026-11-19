import { useEffect, useState } from "react";
import { env } from "./env";

const token = env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;

export function CloudflareAnalytics() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !token) return;

    let idle: number | undefined;
    let timer: number | undefined;

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      } else {
        timer = window.setTimeout(() => setReady(true), 1000);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      window.removeEventListener("load", schedule);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <script
      type="module"
      async
      src="https://static.cloudflareinsights.com/beacon.min.js"
      fetchPriority="low"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
