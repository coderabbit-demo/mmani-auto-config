import { defineConfig } from 'vite';
export default defineConfig({
  define: {
    __VERCEL_ANALYTICS__: JSON.stringify(process.env.VERCEL === '1'
      ? { configString: process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG }
      : null),
  },
  build: { rollupOptions: { output: { manualChunks: id => id.includes('/src/generated/schema-validator.js') ? 'schema-validator' : undefined } } },
});
