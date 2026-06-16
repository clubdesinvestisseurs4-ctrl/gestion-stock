import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Gestion des Stocks',
        short_name: 'Stocks',
        description: 'Gestion des stocks CookAfrica & Hôtel Ohinéné',
        theme_color: '#1a6b3c',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Les appels API ne doivent JAMAIS être interceptés par le Service Worker
        // (données dynamiques + Render peut mettre 30s à se réveiller)
        navigateFallback: null,
        runtimeCaching: [
          {
            // API Render → NetworkOnly : toujours aller au réseau, jamais de cache
            urlPattern: ({ url }) => url.hostname.includes('onrender.com'),
            handler: 'NetworkOnly',
          },
          {
            // Firebase Auth → NetworkOnly
            urlPattern: ({ url }) => url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseapp.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
