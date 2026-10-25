import { useMemo, useSyncExternalStore } from 'react';

/**
 * Schlankes Hash-Routing (#/sammlung). Funktioniert auf GitHub Pages unter jedem
 * Repository-Unterpfad, ohne 404-Fehler beim Neuladen von Unterseiten.
 */
export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = '/' + pathPart.split('/').filter(Boolean).join('/');
  const segments = path.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  return { path, segments, query: new URLSearchParams(queryPart) };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return useMemo(() => parseHash(hash), [hash]);
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function href(path: string): string {
  return `#${path}`;
}
