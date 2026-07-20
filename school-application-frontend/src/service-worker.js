/* eslint-disable no-restricted-globals */
// Offline support for students & parents only. Teachers/admins always hit
// the network — there's no reason for grading/attendance actions to work
// on stale data, so /api/teacher, /api/management, /api/system, /api/admin
// are deliberately left uncached here.

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

clientsClaim();

// App shell (JS/CSS/HTML) — the precache list below is injected at build
// time by workbox-webpack-plugin (CRA auto-wires this because this file
// exists at src/service-worker.js).
precacheAndRoute(self.__WB_MANIFEST);

// Let client-side routes (e.g. /student-dashboard) load from the cached
// index.html when opened directly with no connection.
const fileExtensionRegexp = /\/[^/?]+\.[^/]+$/;
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html'),
    {
      denylist: [fileExtensionRegexp, /^\/_/],
    }
  )
);

// Student & parent GET data (timetable, assignments, grades, attendance,
// materials, quizzes, exams, profile...) — try the network first so data is
// always fresh when online, fall back to the last cached copy when offline.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && /\/api\/(student|parent)\b/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'student-parent-data',
    networkTimeoutSeconds: 6,
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
