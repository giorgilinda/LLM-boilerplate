require("@testing-library/jest-dom");

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
