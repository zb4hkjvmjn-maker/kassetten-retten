import type { CompanyConfig, HandoverId, PackageConfig, VocalOption } from '../config';
import { CONDITION_LABELS, FORMAT_LABELS } from './labels';
import type { Cassette } from './types';

export const HANDOVER_LABELS: Record<HandoverId, { label: string; short: string; hint: string }> = {
  abholung: { label: 'Abholung bei mir', short: 'Abholung', hint: 'Wir holen die Kassetten bei dir ab und bringen sie zurück.' },
  versand: { label: 'Ich schicke sie per Post', short: 'Postversand', hint: 'Du bekommst unsere Adresse und einen Begleitzettel zum Beilegen.' },
  abgabe: { label: 'Ich bringe sie vorbei', short: 'persönliche Abgabe', hint: 'Du gibst die Kassetten persönlich bei uns ab.' },
};

export interface OrderContact {
  name: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
}

export interface FilmBrief {
  occasion: string;
  forWhom: string;
  date: string;
  length: string;
  message: string;
  messageStyle: string;
  photos: boolean;
}

export interface MusicBrief {
  moods: string[];
  genre: string;
  tempo: string;
  instruments: string[];
  vocals: VocalOption['id'] | '';
  language: string;
  names: string;
  story: string;
  words: string;
  notes: string;
}

export const EMPTY_FILM: FilmBrief = { occasion: '', forWhom: '', date: '', length: '', message: '', messageStyle: '', photos: false };
export const EMPTY_MUSIC: MusicBrief = {
  moods: [],
  genre: '',
  tempo: '',
  instruments: [],
  vocals: '',
  language: '',
  names: '',
  story: '',
  words: '',
  notes: '',
};

export interface OrderDraft {
  selected: string[];
  extraCount: string;
  packageId: string;
  extras: string[];
  film: FilmBrief;
  music: MusicBrief;
  handover: HandoverId | '';
  pickupDates: string;
  delivery: string;
  message: string;
  contact: OrderContact;
  rememberContact: boolean;
  privacyAccepted: boolean;
}

export const EMPTY_CONTACT: OrderContact = { name: '', email: '', phone: '', street: '', zip: '', city: '' };

export const EMPTY_DRAFT: OrderDraft = {
  selected: [],
  extraCount: '',
  packageId: '',
  extras: [],
  film: EMPTY_FILM,
  music: EMPTY_MUSIC,
  handover: '',
  pickupDates: '',
  delivery: '',
  message: '',
  contact: EMPTY_CONTACT,
  rememberContact: true,
  privacyAccepted: false,
};

/** Ältere, im Browser gespeicherte Entwürfe auf den aktuellen Stand bringen. */
export function normalizeDraft(d: Partial<OrderDraft> | null | undefined): OrderDraft {
  const v = d ?? {};
  return {
    ...EMPTY_DRAFT,
    ...v,
    selected: Array.isArray(v.selected) ? v.selected : [],
    extras: Array.isArray(v.extras) ? v.extras : [],
    contact: { ...EMPTY_CONTACT, ...(v.contact ?? {}) },
    film: { ...EMPTY_FILM, ...(v.film ?? {}) },
    music: {
      ...EMPTY_MUSIC,
      ...(v.music ?? {}),
      moods: Array.isArray(v.music?.moods) ? v.music.moods : [],
      instruments: Array.isArray(v.music?.instruments) ? v.music.instruments : [],
    },
  };
}

export function findPackage(config: CompanyConfig, id: string): PackageConfig | undefined {
  return config.packages.find((p) => p.id === id);
}

export type StepId = 'kassetten' | 'paket' | 'film' | 'musik' | 'uebergabe' | 'kontakt' | 'absenden';

export const STEP_LABELS: Record<StepId, { short: string; title: string }> = {
  kassetten: { short: 'Kassetten', title: 'Welche Kassetten sollen wir digitalisieren?' },
  paket: { short: 'Paket', title: 'Was soll daraus werden?' },
  film: { short: 'Film', title: 'Erzähl uns von deinem Film' },
  musik: { short: 'Musik', title: 'Wie soll die Musik klingen?' },
  uebergabe: { short: 'Übergabe', title: 'Wie kommen die Kassetten zu uns?' },
  kontakt: { short: 'Kontakt', title: 'Wie erreichen wir dich?' },
  absenden: { short: 'Absenden', title: 'Prüfen und absenden' },
};

/** Welche Schritte die Anfrage hat – Film- und Musikfragen nur bei passenden Paketen. */
export function stepsFor(config: CompanyConfig, d: OrderDraft): StepId[] {
  const pkg = findPackage(config, d.packageId);
  return [
    'kassetten',
    'paket',
    ...(pkg?.film ? (['film'] as StepId[]) : []),
    ...(pkg?.music ? (['musik'] as StepId[]) : []),
    'uebergabe',
    'kontakt',
    'absenden',
  ];
}

export interface SentOrder {
  ref: string;
  createdAt: string;
  method: 'formular' | 'email';
  handover: HandoverId;
  packageName?: string;
  cassettes: { number: number; id: string; title: string; format: string }[];
  extraCount: number;
}

export type OrderErrors = Partial<
  Record<
    | 'selected'
    | 'extraCount'
    | 'packageId'
    | 'occasion'
    | 'filmMessage'
    | 'moods'
    | 'vocals'
    | 'lyrics'
    | 'handover'
    | 'name'
    | 'email'
    | 'phone'
    | 'street'
    | 'zip'
    | 'city'
    | 'privacy',
    string
  >
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Ein Wert zwischen 0 und 500, leer = 0. */
export function parseExtraCount(v: string): number | null {
  const t = v.trim();
  if (t === '') return 0;
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n <= 500 ? n : null;
}

export function needsAddress(h: HandoverId | ''): boolean {
  return h === 'abholung' || h === 'versand';
}

export function validateSelection(d: OrderDraft): OrderErrors {
  const e: OrderErrors = {};
  const extra = parseExtraCount(d.extraCount);
  if (extra === null) e.extraCount = 'Bitte gib eine Zahl zwischen 0 und 500 ein.';
  if (d.selected.length === 0 && (extra ?? 0) === 0) {
    e.selected = 'Bitte wähle mindestens eine Kassette aus oder gib an, wie viele noch nicht erfasste Kassetten dazukommen.';
  }
  return e;
}

export function validatePackage(d: OrderDraft, config: CompanyConfig): OrderErrors {
  return findPackage(config, d.packageId) ? {} : { packageId: 'Bitte wähle ein Paket aus.' };
}

export function validateFilm(d: OrderDraft): OrderErrors {
  const e: OrderErrors = {};
  if (!d.film.occasion) e.occasion = 'Bitte wähle einen Anlass – oder „Einfach so“.';
  if (d.film.message.length > 1500) e.filmMessage = 'Die Botschaft darf höchstens 1500 Zeichen lang sein.';
  return e;
}

export function validateMusic(d: OrderDraft): OrderErrors {
  const e: OrderErrors = {};
  if (d.music.moods.length === 0) e.moods = 'Bitte wähle mindestens eine Stimmung.';
  if (!d.music.vocals) e.vocals = 'Bitte wähle, ob es Gesang geben soll.';
  if (d.music.vocals === 'persoenlich' && !d.music.names.trim() && !d.music.story.trim()) {
    e.lyrics = 'Für ein persönliches Lied brauchen wir Namen oder ein paar Sätze, worum es gehen soll.';
  }
  return e;
}

export function validateHandover(d: OrderDraft): OrderErrors {
  return d.handover ? {} : { handover: 'Bitte wähle, wie die Kassetten zu uns kommen.' };
}

export function validateContact(d: OrderDraft): OrderErrors {
  const e: OrderErrors = {};
  const c = d.contact;
  if (!c.name.trim()) e.name = 'Bitte gib deinen Namen ein.';
  if (!EMAIL_RE.test(c.email.trim())) e.email = 'Bitte gib eine gültige E-Mail-Adresse ein, z. B. name@beispiel.at.';
  if (c.phone.trim() && !/^[+\d][\d\s/()-]{5,}$/.test(c.phone.trim())) e.phone = 'Bitte prüfe die Telefonnummer.';
  if (needsAddress(d.handover)) {
    if (!c.street.trim()) e.street = 'Bitte gib Straße und Hausnummer ein.';
    if (!/^\d{4,5}$/.test(c.zip.trim())) e.zip = 'Bitte gib eine gültige Postleitzahl ein.';
    if (!c.city.trim()) e.city = 'Bitte gib den Ort ein.';
  }
  return e;
}

export function validateFinal(d: OrderDraft, config?: CompanyConfig): OrderErrors {
  const pkg = config ? findPackage(config, d.packageId) : undefined;
  const e = {
    ...validateSelection(d),
    ...(config ? validatePackage(d, config) : {}),
    ...(pkg?.film ? validateFilm(d) : {}),
    ...(pkg?.music ? validateMusic(d) : {}),
    ...validateHandover(d),
    ...validateContact(d),
  };
  if (!d.privacyAccepted) e.privacy = 'Bitte bestätige die Datenschutzhinweise.';
  return e;
}

/** Auftragsnummer wie KR-20261025-4F7Q. */
export function createOrderRef(now = new Date(), random = Math.random): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(random() * chars.length)];
  return `KR-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${code}`;
}

export interface OrderPayload {
  ref: string;
  createdAt: string;
  package: string;
  extras: string[];
  film: FilmBrief | null;
  music: (Omit<MusicBrief, 'vocals'> & { vocals: string }) | null;
  customer: OrderContact;
  handover: string;
  pickupDates: string;
  delivery: string;
  message: string;
  extraCount: number;
  cassettes: {
    number: number;
    title: string;
    format: string;
    year: string;
    condition: string;
    content: string;
    notes: string;
    moments: { time: string; text: string }[];
  }[];
}

export function buildPayload(
  d: OrderDraft,
  cassettes: Cassette[],
  ref: string,
  now = new Date(),
  config?: CompanyConfig,
): OrderPayload {
  const chosen = cassettes.filter((c) => d.selected.includes(c.id));
  const pkg = config ? findPackage(config, d.packageId) : undefined;
  const vocal = config?.music.vocals.find((v) => v.id === d.music.vocals);
  return {
    ref,
    createdAt: now.toISOString(),
    package: pkg ? `${pkg.name}${pkg.price ? ` (${pkg.price})` : ''}` : '',
    extras: config ? config.extras.filter((x) => d.extras.includes(x.id)).map((x) => x.name) : [],
    film: pkg?.film ? { ...d.film } : null,
    music: pkg?.music ? { ...d.music, vocals: vocal?.label ?? '' } : null,
    customer: {
      name: d.contact.name.trim(),
      email: d.contact.email.trim(),
      phone: d.contact.phone.trim(),
      street: needsAddress(d.handover) ? d.contact.street.trim() : '',
      zip: needsAddress(d.handover) ? d.contact.zip.trim() : '',
      city: needsAddress(d.handover) ? d.contact.city.trim() : '',
    },
    handover: d.handover ? HANDOVER_LABELS[d.handover].label : '',
    pickupDates: d.handover === 'abholung' ? d.pickupDates.trim() : '',
    delivery: d.delivery,
    message: d.message.trim(),
    extraCount: parseExtraCount(d.extraCount) ?? 0,
    cassettes: chosen.map((c, i) => ({
      number: i + 1,
      title: c.title,
      format: FORMAT_LABELS[c.format],
      year: c.year,
      condition: CONDITION_LABELS[c.condition],
      content: c.content,
      notes: c.notes,
      moments: (c.moments ?? []).map((m) => ({ time: m.time, text: m.text })),
    })),
  };
}

/** Lesbare Fassung des Auftrags – für E-Mail, Formular-Dienst und zum Kopieren. */
export function orderText(p: OrderPayload, brand: string): string {
  const lines: string[] = [];
  lines.push(`Unverbindliche Digitalisierungsanfrage an ${brand}`);
  lines.push(`Auftragsnummer: ${p.ref}`);
  if (p.package) {
    lines.push('');
    lines.push('PAKET');
    lines.push(p.package);
    if (p.extras.length) lines.push(`Extras: ${p.extras.join(', ')}`);
  }
  if (p.film) {
    const f = p.film;
    lines.push('');
    lines.push('FILMWÜNSCHE');
    if (f.occasion) lines.push(`Anlass: ${f.occasion}`);
    if (f.forWhom) lines.push(`Für: ${f.forWhom}`);
    if (f.date) lines.push(`Wird gebraucht bis: ${f.date}`);
    if (f.length) lines.push(`Länge: ${f.length}`);
    if (f.photos) lines.push('Fotos sollen mit in den Film.');
    if (f.message) lines.push(`Botschaft (${f.messageStyle || 'Art offen'}): ${f.message}`);
  }
  if (p.music) {
    const m = p.music;
    lines.push('');
    lines.push('MUSIKWÜNSCHE');
    if (m.moods.length) lines.push(`Stimmung: ${m.moods.join(', ')}`);
    if (m.genre) lines.push(`Stil: ${m.genre}`);
    if (m.tempo) lines.push(`Tempo: ${m.tempo}`);
    if (m.instruments.length) lines.push(`Instrumente: ${m.instruments.join(', ')}`);
    if (m.vocals) lines.push(`Gesang: ${m.vocals}${m.language ? ` (${m.language})` : ''}`);
    if (m.names) lines.push(`Namen im Lied: ${m.names}`);
    if (m.story) lines.push(`Worum es gehen soll: ${m.story}`);
    if (m.words) lines.push(`Diese Worte sollen vorkommen: ${m.words}`);
    if (m.notes) lines.push(`Weitere Musikwünsche: ${m.notes}`);
  }
  lines.push('');
  lines.push('KONTAKT');
  lines.push(`Name: ${p.customer.name}`);
  lines.push(`E-Mail: ${p.customer.email}`);
  if (p.customer.phone) lines.push(`Telefon: ${p.customer.phone}`);
  if (p.customer.street) lines.push(`Adresse: ${p.customer.street}, ${p.customer.zip} ${p.customer.city}`);
  lines.push('');
  lines.push('ÜBERGABE');
  lines.push(p.handover);
  if (p.pickupDates) lines.push(`Wunschtermine für die Abholung: ${p.pickupDates}`);
  if (p.delivery) lines.push(`Lieferung der Dateien: ${p.delivery}`);
  lines.push('');
  const total = p.cassettes.length + p.extraCount;
  lines.push(`KASSETTEN (${total} insgesamt)`);
  for (const c of p.cassettes) {
    const meta = [c.format, c.year, c.condition].filter(Boolean).join(', ');
    lines.push(`${c.number}. ${c.title} (${meta})`);
    if (c.content) lines.push(`   Inhalt: ${c.content}`);
    if (c.notes) lines.push(`   Notiz: ${c.notes}`);
    for (const m of c.moments) lines.push(`   ★ ${m.time ? `${m.time}: ` : ''}${m.text}`);
  }
  if (p.extraCount > 0) lines.push(`+ ${p.extraCount} weitere, noch nicht erfasste Kassette(n)`);
  if (p.message) {
    lines.push('');
    lines.push('NACHRICHT');
    lines.push(p.message);
  }
  return lines.join('\n');
}

/** mailto-Link; sehr lange Texte werden gekürzt (manche Mailprogramme schneiden sonst ab). */
export function mailtoLink(to: string, p: OrderPayload, brand: string): { href: string; truncated: boolean } {
  const subject = `Digitalisierungsanfrage ${p.ref}`;
  let body = orderText(p, brand);
  let truncated = false;
  const max = 1800;
  if (body.length > max) {
    body = `${body.slice(0, max)}\n\n[… gekürzt – die vollständige Liste bitte aus der App kopieren und einfügen]`;
    truncated = true;
  }
  return { href: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, truncated };
}

/** Sendet an einen Formular-Dienst bzw. eigenen Server. */
export async function submitToEndpoint(config: CompanyConfig, p: OrderPayload): Promise<void> {
  await sendToEndpoint(config, {
    subject: `Digitalisierungsanfrage ${p.ref}`,
    email: p.customer.email,
    name: p.customer.name,
    text: orderText(p, config.brandName),
    data: p,
  });
}

export async function sendToEndpoint(
  config: CompanyConfig,
  msg: { subject: string; email: string; name: string; text: string; data: unknown },
): Promise<void> {
  const body = {
    ...config.order.extraFields,
    subject: msg.subject,
    email: msg.email,
    name: msg.name,
    zusammenfassung: msg.text,
    auftrag: msg.data,
  };
  const res = await fetch(config.order.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
}

/** Allgemeiner mailto-Link (Betreff + Text), gekürzt bei sehr langen Texten. */
export function mailtoFor(to: string, subject: string, body: string): { href: string; truncated: boolean } {
  const max = 1800;
  const truncated = body.length > max;
  const text = truncated ? `${body.slice(0, max)}\n\n[… gekürzt – bitte den vollständigen Text aus der App einfügen]` : body;
  return { href: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, truncated };
}

// ---------- Gutscheine ----------

export interface VoucherDraft {
  value: string;
  recipient: string;
  sender: string;
  greeting: string;
  delivery: string;
  occasionDate: string;
  contact: OrderContact;
  privacyAccepted: boolean;
}

export const EMPTY_VOUCHER: VoucherDraft = {
  value: '',
  recipient: '',
  sender: '',
  greeting: '',
  delivery: '',
  occasionDate: '',
  contact: EMPTY_CONTACT,
  privacyAccepted: false,
};

export type VoucherErrors = Partial<Record<'value' | 'recipient' | 'greeting' | 'delivery' | 'name' | 'email' | 'phone' | 'street' | 'zip' | 'city' | 'privacy', string>>;

export function voucherNeedsAddress(v: VoucherDraft): boolean {
  return /post/i.test(v.delivery);
}

export function validateVoucher(v: VoucherDraft): VoucherErrors {
  const e: VoucherErrors = {};
  if (!v.value) e.value = 'Bitte wähle einen Wert oder ein Paket.';
  if (!v.recipient.trim()) e.recipient = 'Für wen ist der Gutschein? Ein Vorname genügt.';
  if (v.greeting.length > 500) e.greeting = 'Der Gruß darf höchstens 500 Zeichen lang sein.';
  if (!v.delivery) e.delivery = 'Bitte wähle, wie der Gutschein zu dir kommt.';
  const c = validateContact({ ...EMPTY_DRAFT, contact: v.contact, handover: voucherNeedsAddress(v) ? 'versand' : 'abgabe' });
  Object.assign(e, c);
  if (!v.privacyAccepted) e.privacy = 'Bitte bestätige die Datenschutzhinweise.';
  return e;
}

export function createVoucherRef(now = new Date(), random = Math.random): string {
  return createOrderRef(now, random).replace(/^KR-/, 'GS-');
}

export function voucherText(v: VoucherDraft, ref: string, brand: string): string {
  const c = v.contact;
  const lines = [
    `Gutschein-Anfrage an ${brand}`,
    `Nummer: ${ref}`,
    '',
    'GUTSCHEIN',
    `Wert/Paket: ${v.value}`,
    `Für: ${v.recipient.trim()}`,
  ];
  if (v.sender.trim()) lines.push(`Von: ${v.sender.trim()}`);
  if (v.greeting.trim()) lines.push(`Gruß: ${v.greeting.trim()}`);
  if (v.occasionDate.trim()) lines.push(`Wird gebraucht bis: ${v.occasionDate.trim()}`);
  lines.push(`Zustellung: ${v.delivery}`);
  lines.push('', 'KÄUFER', `Name: ${c.name.trim()}`, `E-Mail: ${c.email.trim()}`);
  if (c.phone.trim()) lines.push(`Telefon: ${c.phone.trim()}`);
  if (voucherNeedsAddress(v)) lines.push(`Adresse: ${c.street.trim()}, ${c.zip.trim()} ${c.city.trim()}`);
  return lines.join('\n');
}
