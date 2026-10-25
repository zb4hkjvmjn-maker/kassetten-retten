import { createId } from './id';
import { CONDITION_LABELS, FORMAT_LABELS, STATUS_LABELS } from './labels';
import {
  CHECKLIST_IDS,
  EMPTY_CHECKLIST,
  type Cassette,
  type CassetteInput,
  type Checklist,
  type FormatId,
  type StatusId,
} from './types';

export function emptyInput(): CassetteInput {
  return {
    title: '',
    format: 'unbekannt',
    year: '',
    content: '',
    condition: 'unbekannt',
    location: '',
    notes: '',
    status: 'erfasst',
  };
}

function cleanInput(input: CassetteInput): CassetteInput {
  return {
    ...input,
    title: input.title.trim(),
    year: input.year.trim(),
    content: input.content.trim(),
    location: input.location.trim(),
    notes: input.notes.trim(),
  };
}

export function createCassette(input: CassetteInput, now = new Date()): Cassette {
  const stamp = now.toISOString();
  return {
    ...cleanInput(input),
    id: createId(),
    checklist: { ...EMPTY_CHECKLIST },
    moments: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function applyInput(cassette: Cassette, input: CassetteInput, now = new Date()): Cassette {
  return { ...cassette, ...cleanInput(input), updatedAt: now.toISOString() };
}

export function toInput(c: Cassette): CassetteInput {
  return {
    title: c.title,
    format: c.format,
    year: c.year,
    content: c.content,
    condition: c.condition,
    location: c.location,
    notes: c.notes,
    status: c.status,
  };
}

export function checklistDone(checklist: Checklist): number {
  return CHECKLIST_IDS.filter((id) => checklist[id]).length;
}

export function checklistComplete(checklist: Checklist): boolean {
  return checklistDone(checklist) === CHECKLIST_IDS.length;
}

export interface CollectionFilter {
  query: string;
  format: FormatId | 'alle';
  status: StatusId | 'alle';
}

export const DEFAULT_FILTER: CollectionFilter = { query: '', format: 'alle', status: 'alle' };

function normalize(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Durchsucht Titel, Jahr, Inhalt, Lagerort, Notizen sowie Format-, Status- und Zustandsbezeichnung. */
export function filterCassettes(cassettes: Cassette[], filter: CollectionFilter): Cassette[] {
  const words = normalize(filter.query).split(/\s+/).filter(Boolean);
  return cassettes.filter((c) => {
    if (filter.format !== 'alle' && c.format !== filter.format) return false;
    if (filter.status !== 'alle' && c.status !== filter.status) return false;
    if (words.length === 0) return true;
    const haystack = normalize(
      [
        c.title,
        c.year,
        c.content,
        c.location,
        c.notes,
        FORMAT_LABELS[c.format],
        STATUS_LABELS[c.status],
        CONDITION_LABELS[c.condition],
      ].join(' '),
    );
    return words.every((w) => haystack.includes(w));
  });
}

/** Neueste Einträge zuerst. */
export function sortCassettes(cassettes: Cassette[]): Cassette[] {
  return [...cassettes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function slug(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Vorschlag für einen verständlichen Dateinamen, z. B. „1994_urlaub-am-gardasee_vhs.mp4“. */
export function suggestFileName(c: Pick<Cassette, 'title' | 'year' | 'format'>): string {
  const yearMatch = c.year.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : 'jahr-unbekannt';
  const title = slug(c.title) || 'aufnahme';
  const extension = c.format === 'audio' ? 'wav' : c.format === 'unbekannt' ? 'datei' : 'mp4';
  return `${year}_${title}_${slug(FORMAT_LABELS[c.format])}.${extension}`;
}
