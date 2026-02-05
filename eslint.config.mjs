import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    rules: {
      "react/react-in-jsx-scope": "error",
    },
  },
  {
    ignores: ["coverage/**"],
  },
];

export default config;
