import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ['elkjs/lib/elk-api.js'] },
  build: { manifest: true },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/.builds/**',
        '**/.simulations/**',
        '**/.physical/**',
        '**/.tools/**',
        '**/.npm-cache/**',
      ],
    },
    proxy: { '/api': `http://127.0.0.1:${process.env.YOSIS_API_PORT ?? 3001}` },
  },
});
