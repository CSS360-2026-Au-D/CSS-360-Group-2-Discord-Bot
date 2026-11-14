import js from "@eslint/js";
import globals from "globals";

export default [
    {
        files: ["**/*.{js,mjs,cjs}"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
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