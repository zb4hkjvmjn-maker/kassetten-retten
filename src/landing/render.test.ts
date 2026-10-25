import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { company } from '../config';
import { basePath, renderPage, seoFiles, siteUrl } from './render';

const root = new URL('../../', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, root), 'utf8');

describe('Statische Seiten', () => {
  it('ersetzt alle Platzhalter der Vorlagen', () => {
    for (const [file, page] of [
      ['index.html', ''],
      ['impressum.html', 'impressum.html'],
      ['datenschutz.html', 'datenschutz.html'],
    ]) {
      const html = renderPage(read(file), company, { siteUrl: 'https://beispiel.at/', page, year: 2026 });
      assert.doesNotMatch(html, /\{\{/, `${file} enthält noch {{…}}`);
    }
  });

  it('maskiert Text und markiert offene Angaben', () => {
    const html = renderPage('<p>{{{aboutText}}}</p><p>{{brandName}}</p>', { ...company, brandName: 'A & B <x>' }, { siteUrl: '', page: '' });
    assert.ok(html.includes('A &amp; B &lt;x&gt;'));
    assert.ok(html.includes('class="platzhalter"'));
  });

  it('erzeugt Angaben für Suchmaschinen nur mit bekannter Adresse', () => {
    const withUrl = renderPage('{{{canonical}}}{{{jsonLd}}}{{{ogImage}}}', company, { siteUrl: 'https://kassetten-retten.at/', page: '' });
    assert.ok(withUrl.includes('rel="canonical" href="https://kassetten-retten.at/"'));
    assert.ok(withUrl.includes('"@type":"LocalBusiness"'));
    assert.ok(withUrl.includes('og-image.png'));
    assert.equal(renderPage('{{{canonical}}}', company, { siteUrl: '', page: '' }), '');
  });

  it('bestimmt Adresse und Basis-Pfad für GitHub Pages und eigene Domain', () => {
    assert.equal(siteUrl(company, 'Simple7Media/kassetten-retten'), 'https://simple7media.github.io/kassetten-retten/');
    assert.equal(basePath(company, 'Simple7Media/kassetten-retten'), '/kassetten-retten/');
    assert.equal(basePath(company, 'max/max.github.io'), '/');
    const own = { ...company, domain: 'https://kassetten-retten.at/' };
    assert.equal(siteUrl(own, 'a/b'), 'https://kassetten-retten.at/');
    assert.equal(basePath(own, 'a/b'), '/');
    assert.equal(basePath(company, ''), '/');
  });

  it('nimmt die Preise aus der Konfiguration', () => {
    const html = renderPage('{{{pricing}}}', { ...company, pricing: [{ label: 'VHS', price: 'ab 15 €' }] }, { siteUrl: '', page: '' });
    assert.ok(html.includes('<th scope="row">VHS</th><td>ab 15 €</td>'));
  });

  it('erzeugt robots.txt und sitemap.xml', () => {
    const { robots, sitemap } = seoFiles('https://kassetten-retten.at/');
    assert.ok(robots.includes('Sitemap: https://kassetten-retten.at/sitemap.xml'));
    assert.ok(sitemap.includes('<loc>https://kassetten-retten.at/impressum.html</loc>'));
  });
});
