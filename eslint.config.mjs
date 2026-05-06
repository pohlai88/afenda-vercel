import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: [
      "app/**/*.{js,jsx,ts,tsx}",
      "components/**/*.{js,jsx,ts,tsx}",
      "hooks/**/*.{js,jsx,ts,tsx}",
      "lib/**/*.{js,jsx,ts,tsx}",
    ],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["radix-ui"],
              message:
                "Import primitives only via #components/ui/* — radix-ui stays inside components/ui.",
            },
            {
              group: ["@radix-ui/*"],
              message:
                "Use #components/ui/* wrappers; do not import @radix-ui packages outside components/ui.",
            },
            {
              group: ["@base-ui/react"],
              message:
                "Use #components/ui/* wrappers (e.g. Combobox); @base-ui/react only inside components/ui.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
