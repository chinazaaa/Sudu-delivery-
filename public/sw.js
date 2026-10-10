/*
 * The shop owner's phone, buzzing.
 *
 * This is the whole of the service worker and it does two things: draw a
 * notification when one is pushed, and open the right admin page when it is
 * tapped. It deliberately does not cache anything. A cached admin page is a
 * page showing last hour's orders, and the one thing admin must never do is
 * lie about what is waiting.
 *
 * No imports, no build step. It is served as a plain file from the site root
 * so that its scope covers every path, which is what lets the registration
 * live on /admin and still work when the phone opens the app at /.
 */

self.addEventListener("install", () => {
  // Straight to active. There is no old cache to clear and nothing to migrate,
  // so waiting a page load to take over only delays notifications working.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  // A push with no readable body still deserves a notification: on iOS a push
  // that shows nothing at all counts against the site and can have the
  // subscription dropped.
  var said = { title: "Sudu", body: "Something needs you in admin.", url: "/admin" };
  try {
    if (event.data) {
      var sent = event.data.json();
      if (sent && typeof sent === "object") {
        if (sent.title) said.title = String(sent.title);
        if (sent.body) said.body = String(sent.body);
        if (sent.url) said.url = String(sent.url);
      }
    }
  } catch (e) {
    /* Whatever arrived was not ours. The default above still buzzes. */
  }

  event.waitUntil(
    self.registration.showNotification(said.title, {
      body: said.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // So the phone can tell two alerts about the same thing apart, and so
      // the click handler knows where to go.
      data: { url: said.url },
      // Each one is its own: a new order must not quietly replace the parcel
      // notification that arrived a minute ago.
      tag: said.url + ":" + Date.now(),
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (tabs) {
      // A tab already open on the site is focused and sent there, rather than
      // opening a second copy of admin beside the one being worked in.
      for (var i = 0; i < tabs.length; i += 1) {
        var tab = tabs[i];
        if (new URL(tab.url).origin !== self.location.origin) continue;
        return tab.focus().then(function (focused) {
          return focused && focused.navigate ? focused.navigate(url) : focused;
        });
      }
      return self.clients.openWindow(url);
    })
  );
});
