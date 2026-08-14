/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config'

// `root` pins Vitest to THIS package so a stray parent-dir vitest.config
// in the workspace can't hijack test resolution.
// `getViteConfig` wires Astro's Vite pipeline so the Container API can
// render .astro components server-side (no browser). Its parameter is typed
// as Astro's Vite config, which doesn't declare `test`; the key is valid at
// runtime (Vitest reads it), so we opt the one line out of the type check.
export default getViteConfig({
  // @ts-expect-error — `test` is a Vitest key not present in Astro's config type
  test: {
    root: import.meta.dirname,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
