import { useEffect } from 'react';
import { useStoredState } from './useStoredState';

export type Stil = 'heimelig' | 'modern';
export type Schrift = 'normal' | 'gross' | 'sehr-gross';

export interface Appearance {
  stil: Stil;
  schrift: Schrift;
}

export const APPEARANCE_KEY = 'kassetten-retten:darstellung';
const DEFAULT: Appearance = { stil: 'heimelig', schrift: 'normal' };

/** Stil und Schriftgröße – gespeichert im Browser, angewendet auf <html>. */
export function useAppearance(): [Appearance, (a: Appearance) => void] {
  const [value, setValue] = useStoredState<Appearance>(APPEARANCE_KEY, DEFAULT);
  const stil: Stil = value.stil === 'modern' ? 'modern' : 'heimelig';
  const schrift: Schrift = value.schrift === 'gross' || value.schrift === 'sehr-gross' ? value.schrift : 'normal';

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.stil = stil;
    root.dataset.schrift = schrift;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', stil === 'modern' ? '#f7f6f3' : '#faf4e8');
  }, [stil, schrift]);

  return [{ stil, schrift }, setValue];
}
