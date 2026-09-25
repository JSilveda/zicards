"use client";

import { useEffect, useState } from "react";

/** Current user's logo (data URL) or null for the default. */
export function useBranding() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/queries/user-settings")
      .then(({ getUserSettings }) => getUserSettings())
      .then((settings) => {
        if (!cancelled) setLogo(settings?.logo_data ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { logo, setLogo };
}

/** Resize/crop an uploaded image to a square PNG data URL (default 512px). */
export function fileToLogoDataUrl(file: File, size = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}
