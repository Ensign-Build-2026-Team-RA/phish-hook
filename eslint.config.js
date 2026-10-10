import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        TextEncoder: "readonly",
        URL: "readonly",
        Uint8Array: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [
      "node_modules/",
      ".wrangler/",
      ".codex-ppt-build/",
      "docs/",
      "dist/",
      "phish-hook/dist/",
      "hello.py",
      "worker.js",
    ],
  },
];
