/**
 * Füllt die statischen Seiten (Startseite, Impressum, Datenschutz) beim Build mit den
 * Angaben aus src/config.ts. So stehen alle Texte direkt im HTML – gut für Suchmaschinen,
 * Vorschaubilder in Messengern und Besucher ohne JavaScript.
 *
 * Vorlagen-Syntax:  {{name}} = Text (wird maskiert),  {{{name}}} = fertiges HTML.
 */
import type { CompanyConfig, HandoverId } from '../config';

const HANDOVER_TEXT: Record<HandoverId, { title: string; text: string }> = {
  abholung: { title: 'Abholung', text: 'Wir holen die Kassetten bei dir ab und bringen sie wieder.' },
  versand: { title: 'Postversand', text: 'Du schickst sie uns gut verpackt – mit Begleitzettel aus der App.' },
  abgabe: { title: 'Persönlich vorbeibringen', text: 'Du gibst sie direkt bei uns ab.' },
};

export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const isPlaceholder = (v: string) => /\[[^\]]*\]/.test(v);

/** Text sicher ausgeben; Platzhalter werden markiert, damit sie auffallen. */
function text(v: string): string {
  return isPlaceholder(v) ? `<mark class="platzhalter">${escapeHtml(v)}</mark>` : escapeHtml(v);
}

/** Basis-Adresse der Website, z. B. https://kassetten-retten.at/ – leer, wenn unbekannt. */
export function siteUrl(c: CompanyConfig, githubRepository = ''): string {
  const domain = c.domain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (domain) return `https://${domain}/`;
  const [owner, repo] = githubRepository.split('/');
  if (owner && repo) {
    return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
      ? `https://${repo.toLowerCase()}/`
      : `https://${owner.toLowerCase()}.github.io/${repo}/`;
  }
  return '';
}

/** Pfad, unter dem die Seite liegt: „/“ bei eigener Domain, sonst „/<repository>/“. */
export function basePath(c: CompanyConfig, githubRepository = ''): string {
  if (c.domain.trim()) return '/';
  const [owner, repo] = githubRepository.split('/');
  if (!owner || !repo) return '/';
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${repo}/`;
}

function telHref(phone: string): string {
  if (isPlaceholder(phone)) return '#kontakt';
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function jsonLd(c: CompanyConfig, url: string): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${c.brandName} – ${c.companyName}`,
    description: `Digitalisierung von ${c.services.join(', ')}. Abholung, Postversand oder persönliche Abgabe.`,
  };
  if (url) data.url = url;
  if (!isPlaceholder(c.email)) data.email = c.email;
  if (!isPlaceholder(c.phone)) data.telephone = c.phone;
  if (!isPlaceholder(c.region)) data.areaServed = c.region;
  const lines = c.address.filter((l) => l !== c.companyName);
  if (!lines.some(isPlaceholder) && lines.length >= 2) {
    const zipCity = lines[1].match(/^(\d{4,5})\s+(.+)$/);
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: lines[0],
      ...(zipCity ? { postalCode: zipCity[1], addressLocality: zipCity[2] } : {}),
      addressCountry: 'AT',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function pricing(c: CompanyConfig): string {
  if (c.pricing.length === 0) {
    return `<p class="price-note">Du bekommst vorab ein <strong>unverbindliches Angebot</strong> für genau deine Kassetten. Erst wenn du zustimmst, legen wir los.</p>`;
  }
  const rows = c.pricing.map((p) => `<tr><th scope="row">${text(p.label)}</th><td>${text(p.price)}</td></tr>`).join('');
  return `<table class="price-table"><tbody>${rows}</tbody></table><p class="price-note">Vor dem Start bekommst du ein unverbindliches Angebot.</p>`;
}

function faq(c: CompanyConfig): string {
  const items: [string, string][] = [
    [
      'Welche Kassetten könnt ihr digitalisieren?',
      `${c.services.map(escapeHtml).join(', ')}. Wenn du dir beim Format unsicher bist, hilft dir der kostenlose Rettungshelfer in der App – oder du fragst uns einfach.`,
    ],
    ['Was kostet das?', c.pricing.length ? 'Die Richtpreise findest du oben. Für deine Kassetten bekommst du vorab ein unverbindliches Angebot.' : 'Du bekommst vorab ein unverbindliches Angebot. Die Anfrage selbst ist kostenlos.'],
    ['Bekomme ich meine Originalkassetten zurück?', 'Ja. Du bekommst deine Kassetten zusammen mit den fertigen Dateien zurück.'],
    ['Wie bekomme ich die Dateien?', `Per ${c.deliveryOptions.map(escapeHtml).join(' oder ')}. Die Dateien laufen am Computer, Handy, Tablet und Smart-TV.`],
    ['Eine Kassette ist schimmelig oder das Band ist kaputt.', `${escapeHtml(c.damagedNote)} Bitte spiele sie vorher nicht mehr ab – das kann sie weiter beschädigen.`],
  ];
  if (c.turnaround.trim()) items.push(['Wie lange dauert es?', `In der Regel ${text(c.turnaround)}. Den genauen Zeitpunkt nennen wir dir im Angebot.`]);
  items.push(
    ['Wer sieht meine privaten Aufnahmen?', 'Deine Aufnahmen verwenden wir ausschließlich für die Digitalisierung. Wir geben sie nicht weiter und nutzen sie nicht für Werbung.'],
    ['Muss ich vorher alles in der App erfassen?', 'Nein. Du kannst in der Anfrage auch einfach angeben, wie viele Kassetten es ungefähr sind. Die App ist ein kostenloses Angebot zum Ordnen – keine Pflicht.'],
  );
  return items
    .map(([q, a]) => `<details class="faq__item"><summary>${escapeHtml(q)}</summary><p>${a}</p></details>`)
    .join('\n');
}

function handover(c: CompanyConfig): string {
  return c.handover
    .filter((h) => h !== 'abholung' || c.pickupArea.trim())
    .map((h) => {
      const extra = h === 'abholung' ? ` <span class="muted">Gebiet: ${text(c.pickupArea)}</span>` : '';
      return `<li><strong>${HANDOVER_TEXT[h].title}</strong> – ${HANDOVER_TEXT[h].text}${extra}</li>`;
    })
    .join('');
}

function imprint(c: CompanyConfig): string {
  const i = c.imprint;
  const row = (dt: string, dd: string) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  return [
    row('Medieninhaber und Betreiber', `${text(i.owner)}<br>${escapeHtml(c.companyName)}`),
    row('Anschrift', c.address.map(text).join('<br>')),
    row('Kontakt', `E-Mail: ${text(c.email)}<br>Telefon: ${text(c.phone)}`),
    row('Unternehmensgegenstand', text(i.businessPurpose)),
    row('UID-Nummer', text(i.vatId)),
    row('Firmenbuch', text(i.companyRegister)),
    row('Aufsichtsbehörde', text(i.authority)),
    row('Kammer', text(i.chamber)),
    row('Grundlegende Richtung', 'Information und Hilfe zur Rettung alter Audio- und Videokassetten sowie Angebot zur Digitalisierung.'),
  ].join('\n');
}

function privacySending(c: CompanyConfig): string {
  return c.order.endpoint
    ? 'Die Anfrage wird über einen Formular-Dienst an uns weitergeleitet, der als Auftragsverarbeiter für uns tätig ist.'
    : 'Die Anfrage wird mit deinem eigenen E-Mail-Programm an uns geschickt.';
}

export interface RenderOptions {
  /** Absolute Adresse der Website, z. B. https://kassetten-retten.at/ – leer, wenn unbekannt. */
  siteUrl: string;
  /** Pfad der Seite relativ zur Website, z. B. „“ oder „impressum.html“. */
  page: string;
  year?: number;
}

export function renderPage(html: string, c: CompanyConfig, opts: RenderOptions): string {
  const url = opts.siteUrl ? opts.siteUrl + opts.page : '';
  const plain: Record<string, string> = {
    brandName: c.brandName,
    companyName: c.companyName,
    regionPlain: c.region,
    year: String(opts.year ?? new Date().getFullYear()),
    emailHref: isPlaceholder(c.email) ? '#kontakt' : `mailto:${c.email}`,
    phoneHref: telHref(c.phone),
  };
  const rich: Record<string, string> = {
    region: text(c.region),
    email: text(c.email),
    phone: text(c.phone),
    addressHtml: c.address.map(text).join('<br>'),
    openingHours: text(c.openingHours),
    aboutName: text(c.about.name),
    aboutRole: text(c.about.role),
    aboutText: text(c.about.text),
    privacyContact: text(c.privacyContact),
    servicesList: c.services.map((s) => `<li>${escapeHtml(s)}</li>`).join(''),
    pricing: pricing(c),
    handoverList: handover(c),
    deliveryText: c.deliveryOptions.map(escapeHtml).join(' oder '),
    faq: faq(c),
    imprint: imprint(c),
    privacySending: privacySending(c),
    jsonLd: opts.page === '' ? jsonLd(c, url) : '',
    canonical: url ? `<link rel="canonical" href="${escapeHtml(url)}">` : '',
    ogUrl: url ? `<meta property="og:url" content="${escapeHtml(url)}">` : '',
    ogImage: opts.siteUrl
      ? `<meta property="og:image" content="${escapeHtml(opts.siteUrl)}og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`
      : '',
    supportLink: c.support.url
      ? `<li><a href="${escapeHtml(c.support.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.support.label)}</a></li>`
      : '',
  };
  return html
    .replace(/\{\{\{(\w+)\}\}\}/g, (m, key: string) => (key in rich ? rich[key] : m))
    .replace(/\{\{(\w+)\}\}/g, (m, key: string) => {
      if (key in plain) return escapeHtml(plain[key]);
      if (key in rich) return rich[key];
      return m;
    });
}

/** robots.txt und sitemap.xml – nur sinnvoll, wenn die Adresse bekannt ist. */
export function seoFiles(url: string): { robots: string; sitemap: string } {
  const robots = url ? `User-agent: *\nAllow: /\nSitemap: ${url}sitemap.xml\n` : 'User-agent: *\nAllow: /\n';
  const pages = ['', 'impressum.html', 'datenschutz.html'];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${url}${p}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return { robots, sitemap };
}
