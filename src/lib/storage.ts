import { parseImport } from './validation';
import type { Cassette } from './types';

export const STORAGE_KEY = 'kassetten-retten:sammlung:v1';
export const LAST_EXPORT_KEY = 'kassetten-retten:letzte-sicherung';

function getStorage(kind: 'local' | 'session'): Storage | null {
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__kassetten-retten-probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return getStorage('local') !== null;
}

export function readJSON<T>(key: string, fallback: T, kind: 'local' | 'session' = 'local'): T {
  const storage = getStorage(kind);
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, kind: 'local' | 'session' = 'local'): boolean {
  const storage = getStorage(kind);
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export interface LoadResult {
  cassettes: Cassette[];
  /** Hinweis, falls gespeicherte Daten nicht gelesen werden konnten. */
  problem?: string;
}

export function loadCollection(): LoadResult {
  const storage = getStorage('local');
  if (!storage) {
    return {
      cassettes: [],
      problem:
        'Dein Browser erlaubt gerade keine lokale Speicherung (z. B. im privaten Modus). Deine Einträge gehen beim Schließen verloren – sichere sie über „Sicherung herunterladen“.',
    };
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { cassettes: [] };
  const parsed = parseImport(raw);
  if (parsed.ok) return { cassettes: parsed.cassettes };
  // Defekte Daten nicht überschreiben, sondern beiseitelegen, damit nichts verloren geht.
  try {
    storage.setItem(`${STORAGE_KEY}:defekt:${Date.now()}`, raw);
  } catch {
    /* ignorieren */
  }
  return {
    cassettes: [],
    problem:
      'Die gespeicherte Sammlung konnte nicht gelesen werden. Die alten Daten wurden im Browser beiseitegelegt. Falls du eine Sicherungsdatei hast, kannst du sie importieren.',
  };
}

export function saveCollection(cassettes: Cassette[]): boolean {
  return writeJSON(STORAGE_KEY, { app: 'kassetten-retten', version: 1, cassettes });
}

/** Bittet den Browser, die Daten nicht automatisch zu löschen (wo unterstützt). */
export function requestPersistentStorage(): void {
  try {
    const storage = navigator.storage;
    if (storage && typeof storage.persist === 'function') {
      void storage.persist().catch(() => undefined);
    }
  } catch {
    /* nicht unterstützt */
  }
}
