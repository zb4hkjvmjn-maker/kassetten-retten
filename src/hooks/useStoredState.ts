import { useEffect, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

/** Zustand, der im Browser gespeichert wird (z. B. Ansicht oder Antworten im Rettungshelfer). */
export function useStoredState<T>(
  key: string,
  initial: T,
  kind: 'local' | 'session' = 'local',
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial, kind));
  useEffect(() => {
    writeJSON(key, value, kind);
  }, [key, value, kind]);
  return [value, setValue];
}
