import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Construimos el CSP como un array para que sea legible y mantenible
const cspDirectives = [
  "default-src 'self'",
  // SCRIPT-SRC: La regla de oro. Cero scripts externos, cero scripts en línea. 
  // Si un atacante inyecta un <script> malicioso, el navegador se negará a ejecutarlo.
  "script-src 'self'",
  // STYLE-SRC: Permitimos 'unsafe-inline' estrictamente para que Framer Motion pueda animar.
  // Tailwind CSS se extraerá a un archivo externo durante el build de producción.
  "style-src 'self' 'unsafe-inline'",
  // CONNECT-SRC: Define exactamente a dónde puede hacer fetch() o WebSockets tu app.
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'", // Bloquea la ejecución de plugins antiguos (Flash, Java)
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'", // Bloquea el Clickjacking (nadie puede meter tu app en un iframe)
  "upgrade-insecure-requests"
].join('; ');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EliShamaPopuli',
        short_name: 'EliShama',
        description: 'Plataforma de Votación Democrática Segura y Auditable',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    // Estas cabeceras se aplican en el servidor de desarrollo local
    headers: {
      'Content-Security-Policy': cspDirectives,
      'X-Content-Type-Options': 'nosniff', // Previene que el navegador "adivine" mimetypes
      'X-Frame-Options': 'DENY'
    }
  },
  build: {
    sourcemap: false, // CRÍTICO: No expongas tus source maps en producción en una app de votación
    rollupOptions: {
      output: {
        // Generar hashes fuertes para evitar problemas de caché y facilitar la auditoría
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
