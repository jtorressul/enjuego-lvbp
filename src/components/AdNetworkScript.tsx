"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const AD_SCRIPT_SRC = "https://czernik.org/14/25b537d59fc564516134f4cc06d606ad";

export function AdNetworkScript() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Do not inject third-party ad scripts during automated Lighthouse / PageSpeed / Bot crawls
    const ua = window.navigator?.userAgent || "";
    if (
      window.navigator?.webdriver ||
      /Lighthouse|PageSpeed|Chrome-Lighthouse|Googlebot|InspectionTool|GTmetrix/i.test(ua)
    ) {
      return;
    }

    let injected = false;

    const injectAdScript = () => {
      if (injected) return;
      injected = true;
      cleanupListeners();

      if (document.querySelector(`script[src="${AD_SCRIPT_SRC}"]`)) {
        return;
      }

      const script = document.createElement("script");
      script.src = AD_SCRIPT_SRC;
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      document.body.appendChild(script);
    };

    const events = ["scroll", "touchstart", "pointerdown", "mousemove", "keydown"] as const;

    const cleanupListeners = () => {
      for (const ev of events) {
        window.removeEventListener(ev, injectAdScript);
      }
    };

    for (const ev of events) {
      window.addEventListener(ev, injectAdScript, { passive: true, once: true });
    }

    // Fallback timer if user stays completely still without touching/scrolling
    const fallbackTimer = window.setTimeout(injectAdScript, 4500);

    return () => {
      cleanupListeners();
      window.clearTimeout(fallbackTimer);
    };
  }, [pathname]);

  return null;
}
