import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { company } from './src/config';
import { basePath, renderPage, seoFiles, siteUrl } from './src/landing/render';

const root = fileURLToPath(new URL('.', import.meta.url));
/** Wird von GitHub Actions gesetzt, z. B. „simple7media/kassetten-retten“. */
const repository = process.env.GITHUB_REPOSITORY ?? '';

/** Füllt Startseite, Impressum und Datenschutz mit den Angaben aus src/config.ts. */
function staticPages(): Plugin {
  const url = siteUrl(company, repository);
  return {
    name: 'kassetten-retten-seiten',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = ctx.path.replace(/^\//, '').replace(/index\.html$/, '');
        return renderPage(html, company, { siteUrl: url, page });
      },
    },
    generateBundle() {
      const { robots, sitemap } = seoFiles(url);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (url) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
      const domain = company.domain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (domain) this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${domain}\n` });
    },
  };
}

/**
 * Seitenaufbau:
 *   /                 Startseite (statisch, für Suchmaschinen)
 *   /impressum.html   Impressum
 *   /datenschutz.html Datenschutz
 *   /app/             die App (Sammlung, Rettungshelfer, Anfrage)
 *
 * Der Basis-Pfad ergibt sich automatisch: „/“ bei eigener Domain (config.domain),
 * sonst „/<repository>/“ für GitHub Pages. BASE_PATH überschreibt ihn bei Bedarf.
 */
export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || (command === 'build' ? basePath(company, repository) : '/'),
  plugins: [react(), staticPages()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        start: `${root}index.html`,
        impressum: `${root}impressum.html`,
        datenschutz: `${root}datenschutz.html`,
        app: `${root}app/index.html`,
      },
    },
  },
}));
