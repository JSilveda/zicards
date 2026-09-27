"use client";

import { useEffect } from "react";

/** Applies the user's custom logo as the browser tab favicon (falls back to default). */
export function BrandingEffects() {
  useEffect(() => {
    import("@/lib/queries/user-settings")
      .then(({ getUserSettings }) => getUserSettings())
      .then((settings) => {
        if (!settings?.logo_data) return;
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.type = "image/png";
        link.href = settings.logo_data;
      })
      .catch(() => {});
  }, []);

  return null;
}
