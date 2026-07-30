// Lets the app activate a waiting service worker when the user taps "تحديث".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
