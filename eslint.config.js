import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

// export default defineConfig([
//   { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
// ]);

export default [
    {
        files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                fetch: "readonly",
                AbortSignal: "readonly"
            },
        },
    },
    {
        ignores: [
            "node_modules/",
            "coverage/",
        ],
    },
];
