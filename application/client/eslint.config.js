import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.{js,jsx}"],
        plugins: { react, "react-hooks": reactHooks },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
            "no-unused-vars": "off",
            "react-hooks/set-state-in-effect": "off",
            // ...react.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
        },
        settings: { react: { version: "detect" } },
    },
];