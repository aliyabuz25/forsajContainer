import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    base: mode === 'production' ? '/admin/' : '/',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-quill-new') || id.includes('/quill/')) return 'vendor-editor';
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('lucide-react') || id.includes('framer-motion')) return 'vendor-ui';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
