import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test files use vitest/@playwright/test, isolated from the app's own
    // dependency graph and tsconfig — see
    // docs/authentication-implementation.md, "Automated tests".
    "tests/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
