import { createId } from './id';
import {
  CHECKLIST_IDS,
  CONDITION_IDS,
  EMPTY_CHECKLIST,
  FIELD_LIMITS,
  FORMAT_IDS,
  STATUS_IDS,
  type Cassette,
  type CassetteInput,
  type Checklist,
  type ConditionId,
  type Moment,
  MOMENT_LIMITS,
  type FormatId,
  type StatusId,
} from './types';

export const EXPORT_APP_ID = 'kassetten-retten';
export const EXPORT_VERSION = 1;
/** Größere Dateien sind für eine Kassettenliste unrealistisch und werden abgelehnt. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ITEMS = 5000;

export type FieldErrors = Partial<Record<keyof CassetteInput, string>>;

export function validateInput(input: CassetteInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.title.trim()) {
    errors.title = 'Bitte gib einen Titel ein, z. B. „Hochzeit Oma und Opa“.';
  } else if (input.title.trim().length > FIELD_LIMITS.title) {
    errors.title = `Der Titel darf höchstens ${FIELD_LIMITS.title} Zeichen lang sein.`;
  }
  if (!(FORMAT_IDS as readonly string[]).includes(input.format)) {
    errors.format = 'Bitte wähle ein Format aus.';
  }
  if (input.year.trim().length > FIELD_LIMITS.year) {
    errors.year = `Bitte höchstens ${FIELD_LIMITS.year} Zeichen, z. B. „1994“ oder „um 1990“.`;
  }
  if (input.content.length > FIELD_LIMITS.content) {
    errors.content = `Bitte höchstens ${FIELD_LIMITS.content} Zeichen.`;
  }
  if (input.location.length > FIELD_LIMITS.location) {
    errors.location = `Bitte höchstens ${FIELD_LIMITS.location} Zeichen.`;
  }
  if (input.notes.length > FIELD_LIMITS.notes) {
    errors.notes = `Bitte höchstens ${FIELD_LIMITS.notes} Zeichen.`;
  }
  return errors;
}

export interface ExportFile {
  app: typeof EXPORT_APP_ID;
  version: number;
  exportedAt: string;
  cassettes: Cassette[];
}

export function buildExport(cassettes: Cassette[], now = new Date()): string {
  const data: ExportFile = {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    cassettes,
  };
  return JSON.stringify(data, null, 2);
}

export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kassetten-retten-sicherung-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ImportResult =
  | { ok: true; cassettes: Cassette[]; warnings: string[] }
  | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function readText(
  item: Record<string, unknown>,
  key: string,
  max: number,
  label: string,
  errors: string[],
  required = false,
): string {
  const value = item[key];
  if (value === undefined || value === null) {
    if (required) errors.push(`${label} fehlt.`);
    return '';
  }
  if (typeof value !== 'string') {
    errors.push(`${label} muss ein Text sein.`);
    return '';
  }
  const trimmed = value.trim();
  if (required && !trimmed) errors.push(`${label} ist leer.`);
  if (trimmed.length > max) errors.push(`${label} ist länger als ${max} Zeichen.`);
  return trimmed;
}

function readEnum<T extends string>(
  item: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T,
  label: string,
  errors: string[],
): T {
  const value = item[key];
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  errors.push(`${label} „${String(value)}“ ist unbekannt.`);
  return fallback;
}

function readDate(value: unknown, fallback: string): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return fallback;
}

function readChecklist(value: unknown, errors: string[]): Checklist {
  if (value === undefined || value === null) return { ...EMPTY_CHECKLIST };
  if (!isRecord(value)) {
    errors.push('Die Sicherungscheckliste hat ein ungültiges Format.');
    return { ...EMPTY_CHECKLIST };
  }
  const result: Checklist = { ...EMPTY_CHECKLIST };
  for (const id of CHECKLIST_IDS) {
    const v = value[id];
    if (v === undefined) continue;
    if (typeof v !== 'boolean') {
      errors.push('Die Sicherungscheckliste enthält ungültige Werte.');
      continue;
    }
    result[id] = v;
  }
  return result;
}

function readMoments(value: unknown, errors: string[]): Moment[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MOMENT_LIMITS.count) {
    errors.push('Die Lieblingsmomente haben ein ungültiges Format.');
    return [];
  }
  const result: Moment[] = [];
  for (const m of value) {
    if (!isRecord(m) || typeof m.text !== 'string' || (m.time !== undefined && typeof m.time !== 'string')) {
      errors.push('Ein Lieblingsmoment ist ungültig.');
      return [];
    }
    const text = m.text.trim();
    const time = typeof m.time === 'string' ? m.time.trim() : '';
    if (!text || text.length > MOMENT_LIMITS.text || time.length > MOMENT_LIMITS.time) {
      errors.push('Ein Lieblingsmoment ist leer oder zu lang.');
      return [];
    }
    result.push({ id: typeof m.id === 'string' && m.id ? m.id.slice(0, 100) : createId(), time, text });
  }
  return result;
}

/**
 * Prüft den Inhalt einer Importdatei. Akzeptiert das eigene Exportformat
 * sowie (tolerant) eine reine Liste von Kassetten.
 */
export function parseImport(text: string, now = new Date()): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, errors: ['Die Datei ist zu groß. Eine Sicherung dieser App ist deutlich kleiner als 5 MB.'] };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: ['Die Datei ist keine gültige JSON-Datei. Bitte wähle eine Sicherungsdatei, die mit dieser App erstellt wurde.'],
    };
  }

  let items: unknown;
  if (Array.isArray(data)) {
    items = data;
  } else if (isRecord(data)) {
    if (data.app !== undefined && data.app !== EXPORT_APP_ID) {
      return { ok: false, errors: ['Diese Datei stammt nicht aus „Kassetten retten“.'] };
    }
    if (typeof data.version === 'number' && data.version > EXPORT_VERSION) {
      return {
        ok: false,
        errors: ['Diese Sicherung wurde mit einer neueren Version der App erstellt und kann hier noch nicht gelesen werden.'],
      };
    }
    items = data.cassettes;
  }

  if (!Array.isArray(items)) {
    return { ok: false, errors: ['In der Datei wurde keine Kassettenliste gefunden.'] };
  }
  if (items.length > MAX_IMPORT_ITEMS) {
    return { ok: false, errors: [`Die Datei enthält mehr als ${MAX_IMPORT_ITEMS} Einträge.`] };
  }

  const nowIso = now.toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();
  const cassettes: Cassette[] = [];
  let reassigned = 0;

  items.forEach((raw, index) => {
    const position = `Eintrag ${index + 1}`;
    if (!isRecord(raw)) {
      errors.push(`${position}: ist keine Kassette.`);
      return;
    }
    const itemErrors: string[] = [];
    const title = readText(raw, 'title', FIELD_LIMITS.title, 'Titel', itemErrors, true);
    const format = readEnum<FormatId>(raw, 'format', FORMAT_IDS, 'unbekannt', 'Format', itemErrors);
    const status = readEnum<StatusId>(raw, 'status', STATUS_IDS, 'erfasst', 'Status', itemErrors);
    const condition = readEnum<ConditionId>(raw, 'condition', CONDITION_IDS, 'unbekannt', 'Zustand', itemErrors);
    const year = readText(raw, 'year', FIELD_LIMITS.year, 'Aufnahmejahr', itemErrors);
    const content = readText(raw, 'content', FIELD_LIMITS.content, 'Inhalt', itemErrors);
    const location = readText(raw, 'location', FIELD_LIMITS.location, 'Lagerort', itemErrors);
    const notes = readText(raw, 'notes', FIELD_LIMITS.notes, 'Notizen', itemErrors);
    const checklist = readChecklist(raw.checklist, itemErrors);
    const moments = readMoments(raw.moments, itemErrors);

    if (itemErrors.length > 0) {
      const name = title ? ` („${title.slice(0, 40)}“)` : '';
      errors.push(...itemErrors.map((e) => `${position}${name}: ${e}`));
      return;
    }

    let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 100) : '';
    if (!id || seenIds.has(id)) {
      id = createId();
      reassigned += 1;
    }
    seenIds.add(id);

    const createdAt = readDate(raw.createdAt, nowIso);
    cassettes.push({
      id,
      title,
      format,
      year,
      content,
      condition,
      location,
      notes,
      status,
      checklist,
      moments,
      ...(raw.sample === true ? { sample: true } : {}),
      ...(typeof raw.orderRef === 'string' && /^KR-[\w-]{1,30}$/.test(raw.orderRef) ? { orderRef: raw.orderRef } : {}),
      createdAt,
      updatedAt: readDate(raw.updatedAt, createdAt),
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  if (reassigned > 0) {
    warnings.push(`${reassigned} Einträge hatten keine eindeutige Kennung und haben eine neue erhalten.`);
  }
  return { ok: true, cassettes, warnings };
}

/** Fügt importierte Kassetten hinzu und vergibt bei Kennungs-Konflikten neue IDs. */
export function mergeCassettes(existing: Cassette[], incoming: Cassette[]): Cassette[] {
  const ids = new Set(existing.map((c) => c.id));
  const added = incoming.map((c) => {
    if (!ids.has(c.id)) {
      ids.add(c.id);
      return c;
    }
    const id = createId();
    ids.add(id);
    return { ...c, id };
  });
  return [...existing, ...added];
}
