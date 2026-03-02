// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // ✅ UPDATED: Matches your Hostinger subfolder so assets load correctly
  base: '/', 
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // ✅ Multiple entry points: Main App + WordPress Showcase
      input: {
        main: path.resolve(__dirname, 'index.html'), 
        showcase: path.resolve(__dirname, 'src/public-view.tsx'), 
      },
      output: {
        // ✅ Ensures the WordPress script always has a fixed name
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'showcase' 
            ? 'assets/aie-rental-showcase.js' 
            : 'assets/[name]-[hash].js';
        },
        // ✅ Predictable names for the internal chunks (React, Firebase, etc.)
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 3000,
    host: true,
  },
});