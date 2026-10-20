import { defineConfig } from 'vite';
export default defineConfig({
  build: { rollupOptions: { output: { manualChunks: id => id.includes('/src/generated/schema-validator.js') ? 'schema-validator' : undefined } } },
});
