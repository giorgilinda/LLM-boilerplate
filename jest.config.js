module.exports = {
  transform: {
    "^.+\\.(ts|tsx)$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Playwright specs live in tests/e2e and must be run by Playwright, not Jest.
  // Jest cannot load @playwright/test, so exclude that directory here.
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
};
