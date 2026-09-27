/* ZiCards service worker — RETIRED.
 * This kill-switch unregisters any previously installed worker and clears
 * its caches so browsers go back to plain network behavior. Do NOT delete
 * this file: a missing file would leave old workers running forever.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => {
        if ("navigate" in c) c.navigate(c.url);
      });
    })()
  );
});
