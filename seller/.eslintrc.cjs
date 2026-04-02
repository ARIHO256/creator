/* eslint-disable no-undef */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["react", "react-hooks", "react-refresh", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  settings: {
    react: { version: "detect" },
  },
  ignorePatterns: ["dist", "build", "node_modules"],
  overrides: [
    {
      files: ["*.config.js", "*.config.cjs", "postcss.config.js", "tailwind.config.js"],
      env: { node: true },
    },
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-refresh/only-export-components": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-empty": ["error", { "allowEmptyCatch": true }],
  },
};
