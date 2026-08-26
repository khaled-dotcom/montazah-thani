import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * `next lint` was removed in Next.js 16; linting runs through the ESLint CLI.
 * core-web-vitals promotes the rules that actually affect users (unsized images,
 * blocking scripts) from warnings to errors, which is what we want in CI.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'data/**',
    'next-env.d.ts',
    // The assistant service — Python, with Jinja templates that only look
    // like JavaScript. It has its own toolchain; see agent/README.md.
    'agent/**',
  ]),
  {
    rules: {
      // Unused variables are a real signal in a codebase this size, but an
      // underscore prefix is the conventional way to say "deliberately unused".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
]);
