import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * base: './' erzeugt relative Pfade zu allen Dateien. Zusammen mit dem Hash-Routing
 * (#/sammlung) funktioniert die App dadurch unter jedem Unterpfad, z. B.
 * https://<nutzername>.github.io/kassetten-retten/ – ohne Anpassung am Repository-Namen.
 * Wer einen festen Pfad möchte, setzt beim Build BASE_PATH, z. B. BASE_PATH=/kassetten-retten/.
 */
export default defineConfig({
  base: process.env.BASE_PATH || './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
