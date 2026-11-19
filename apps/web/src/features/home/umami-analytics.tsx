import { useEffect } from "react";
import { env } from "@/env";

const websiteId = env.VITE_UMAMI_WEBSITE_ID;

type UmamiWindow = Window & {
  umami?: {
    track: (pageview: (defaults: Record<string, unknown>) => Record<string, unknown>) => void;
  };
};

let trackerReady: Promise<boolean> | undefined;

function loadTracker(id: string) {
  return (trackerReady ??= new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cloud.umami.is/script.js";
    script.async = true;
    script.fetchPriority = "low";
    script.referrerPolicy = "no-referrer";
    script.dataset.websiteId = id;
    // The tracker lives across client-side navigation, so only send explicit pageviews.
    script.dataset.autoTrack = "false";
    script.dataset.excludeSearch = "true";
    script.dataset.excludeHash = "true";
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      trackerReady = undefined;
      resolve(false);
    };
    document.head.append(script);
  }));
}

export function UmamiAnalytics() {
  useEffect(() => {
    if (!import.meta.env.PROD || !websiteId) return;

    let active = true;
    void loadTracker(websiteId).then((loaded) => {
      if (!loaded || !active || window.location.pathname !== "/") return;

      const referrer = document.referrer ? new URL(document.referrer).origin : "";
      (window as UmamiWindow).umami?.track((defaults) => ({ ...defaults, url: "/", referrer }));
    });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
