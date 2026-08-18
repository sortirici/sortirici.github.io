import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sortirici.github.io',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets',
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      esbuild: {
        drop: ['console', 'debugger'],
      },
    },
  },
});