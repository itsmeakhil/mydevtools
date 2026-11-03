import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  // Liquid Glass: blur is a material, defined once (globals.css + components/ui,
  // shell). Feature code uses the .glass/.liquid classes, never raw backdrop-*.
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**", "src/components/shell/**", "src/components/sidebar/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/backdrop-(blur|filter|saturate)/]",
          message: "Use the .glass / .liquid material classes instead of backdrop-* (see DESIGN.md).",
        },
        {
          selector: "TemplateElement[value.raw=/backdrop-(blur|filter|saturate)/]",
          message: "Use the .glass / .liquid material classes instead of backdrop-* (see DESIGN.md).",
        },
      ],
    },
  },
]);
