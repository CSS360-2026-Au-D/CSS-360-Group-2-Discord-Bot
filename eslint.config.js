import js from "@eslint/js";

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