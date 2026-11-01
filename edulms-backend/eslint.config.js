const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },

  js.configs.recommended,

  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },

  {
    files: ["tests/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
