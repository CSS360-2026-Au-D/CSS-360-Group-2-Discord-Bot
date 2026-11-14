import js from "@eslint/js";
<<<<<<< HEAD

export default [
    {
        files: ["**/*.js"],
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
=======
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
]);
>>>>>>> 23d72614e6ce1880d8bddf19631f96706edd2ef8
