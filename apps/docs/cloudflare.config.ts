import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'breadc',
    compatibilityDate: '2026-09-29',
    workersDev: true,
    assets: {
      htmlHandling: 'auto-trailing-slash',
      notFoundHandling: '404-page'
    }
  }
});
