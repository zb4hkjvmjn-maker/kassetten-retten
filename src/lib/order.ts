import type { CompanyConfig, HandoverId } from '../config';
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

export interface OrderDraft {
  selected: string[];
  extraCount: string;
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
  handover: '',
  pickupDates: '',
  delivery: '',
  message: '',
  contact: EMPTY_CONTACT,
  rememberContact: true,
  privacyAccepted: false,
};

export interface SentOrder {
  ref: string;
  createdAt: string;
  method: 'formular' | 'email';
  handover: HandoverId;
  cassettes: { number: number; id: string; title: string; format: string }[];
  extraCount: number;
}

export type OrderErrors = Partial<Record<'selected' | 'extraCount' | 'handover' | 'name' | 'email' | 'phone' | 'street' | 'zip' | 'city' | 'privacy', string>>;

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

export function validateFinal(d: OrderDraft): OrderErrors {
  const e = { ...validateSelection(d), ...validateHandover(d), ...validateContact(d) };
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
  customer: OrderContact;
  handover: string;
  pickupDates: string;
  delivery: string;
  message: string;
  extraCount: number;
  cassettes: { number: number; title: string; format: string; year: string; condition: string; content: string; notes: string }[];
}

export function buildPayload(d: OrderDraft, cassettes: Cassette[], ref: string, now = new Date()): OrderPayload {
  const chosen = cassettes.filter((c) => d.selected.includes(c.id));
  return {
    ref,
    createdAt: now.toISOString(),
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
    })),
  };
}

/** Lesbare Fassung des Auftrags – für E-Mail, Formular-Dienst und zum Kopieren. */
export function orderText(p: OrderPayload, brand: string): string {
  const lines: string[] = [];
  lines.push(`Unverbindliche Digitalisierungsanfrage an ${brand}`);
  lines.push(`Auftragsnummer: ${p.ref}`);
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
  const body = {
    ...config.order.extraFields,
    subject: `Digitalisierungsanfrage ${p.ref}`,
    email: p.customer.email,
    name: p.customer.name,
    zusammenfassung: orderText(p, config.brandName),
    auftrag: p,
  };
  const res = await fetch(config.order.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
}
