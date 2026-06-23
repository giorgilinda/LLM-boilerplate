require("@testing-library/jest-dom");

// jsdom doesn't implement scrollIntoView; stub it so components that auto-scroll
// (e.g. the chat thread in src/app/page.tsx) don't throw during tests.
if (
  typeof window !== "undefined" &&
  !window.HTMLElement.prototype.scrollIntoView
) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}
