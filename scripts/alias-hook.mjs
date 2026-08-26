import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Teaches `node --test` the "@/..." alias from tsconfig.json.
 *
 * Node resolves modules on its own and does not read tsconfig paths, so without
 * this the tests fail on the first `@/lib/...` import. A twenty-line resolve
 * hook is cheaper than pulling in a whole test runner just to get path mapping,
 * and it keeps the test environment the same runtime that serves production.
 *
 * Node 22.6+ strips the TypeScript types itself, so nothing needs compiling.
 */

const root = process.cwd();
const extensions = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx'];

export function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) return nextResolve(specifier, context);

  const base = path.join(root, specifier.slice(2));
  for (const extension of extensions) {
    const candidate = base + extension;
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
