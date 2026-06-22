require("@testing-library/jest-dom");

// jsdom doesn't implement scrollIntoView; stub it so components that auto-scroll
// (e.g. the chat thread in src/app/page.tsx) don't throw during tests.
if (
  typeof window !== "undefined" &&
  !window.HTMLElement.prototype.scrollIntoView
) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}

// jsdom does not provide fetch; expose it so jest.spyOn(global, "fetch") works (Node 18+ has undici)
if (typeof global.fetch === "undefined") {
  try {
    const { fetch, Response } = require("undici");
    global.fetch = fetch;
    global.Response = Response;
  } catch (_) {
    // Node < 18; install undici or use a fetch polyfill
  }
}
