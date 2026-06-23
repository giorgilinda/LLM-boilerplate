module.exports = {
  transform: {
    "^.+\\.(ts|tsx)$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Playwright specs live in tests/e2e and must be run by Playwright, not Jest.
  // Jest cannot load @playwright/test, so exclude that directory here.
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/"],
  moduleNameMapper: {
    // CSS must be mapped before the @/ alias, otherwise @/…/*.module.css
    // resolves to the real file and Jest chokes on the syntax.
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
