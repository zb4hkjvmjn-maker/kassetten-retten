import { useCallback, useEffect, useRef, useState } from 'react';
import { applyInput, createCassette } from '../lib/collection';
import { createId } from '../lib/id';
import { createSampleCassettes } from '../lib/sampleData';
import { loadCollection, requestPersistentStorage, saveCollection } from '../lib/storage';
import { mergeCassettes } from '../lib/validation';
import type { Cassette, CassetteInput, ChecklistId, StatusId } from '../lib/types';

export interface CollectionApi {
  cassettes: Cassette[];
  loadProblem?: string;
  saveFailed: boolean;
  add: (input: CassetteInput) => Cassette;
  update: (id: string, input: CassetteInput) => void;
  setStatus: (id: string, status: StatusId) => void;
  toggleChecklist: (id: string, item: ChecklistId, done: boolean) => void;
  remove: (id: string) => void;
  replaceAll: (cassettes: Cassette[]) => void;
  addMany: (cassettes: Cassette[]) => void;
  loadSamples: () => number;
  removeSamples: () => number;
  clearAll: () => void;
  markOrdered: (ids: string[], ref: string) => void;
  addMoment: (id: string, time: string, text: string) => void;
  removeMoment: (id: string, momentId: string) => void;
}

export function useCollection(): CollectionApi {
  const [initial] = useState(loadCollection);
  const [cassettes, setCassettes] = useState<Cassette[]>(initial.cassettes);
  const [saveFailed, setSaveFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ok = saveCollection(cassettes);
    setSaveFailed(!ok);
    if (ok && cassettes.length > 0) requestPersistentStorage();
  }, [cassettes]);

  // Änderungen aus anderen Tabs übernehmen.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('kassetten-retten:sammlung')) {
        setCassettes(loadCollection().cassettes);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((input: CassetteInput) => {
    const c = createCassette(input);
    setCassettes((prev) => [...prev, c]);
    return c;
  }, []);

  const update = useCallback((id: string, input: CassetteInput) => {
    setCassettes((prev) => prev.map((c) => (c.id === id ? applyInput(c, input) : c)));
  }, []);

  const setStatus = useCallback((id: string, status: StatusId) => {
    setCassettes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)),
    );
  }, []);

  const toggleChecklist = useCallback((id: string, item: ChecklistId, done: boolean) => {
    setCassettes((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, checklist: { ...c.checklist, [item]: done }, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setCassettes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const replaceAll = useCallback((next: Cassette[]) => setCassettes(next), []);

  const addMany = useCallback((incoming: Cassette[]) => {
    setCassettes((prev) => mergeCassettes(prev, incoming));
  }, []);

  const loadSamples = useCallback(() => {
    const samples = createSampleCassettes();
    setCassettes((prev) => mergeCassettes(prev, samples));
    return samples.length;
  }, []);

  const removeSamples = useCallback(() => {
    const count = cassettes.filter((c) => c.sample).length;
    setCassettes((prev) => prev.filter((c) => !c.sample));
    return count;
  }, [cassettes]);

  const clearAll = useCallback(() => setCassettes([]), []);

  /** Angefragte Kassetten erhalten die Auftragsnummer und den Status „Digitalisierung geplant“. */
  const markOrdered = useCallback((ids: string[], ref: string) => {
    const now = new Date().toISOString();
    setCassettes((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? { ...c, orderRef: ref, status: c.status === 'erfasst' ? 'geplant' : c.status, updatedAt: now }
          : c,
      ),
    );
  }, []);

  const addMoment = useCallback((id: string, time: string, text: string) => {
    const now = new Date().toISOString();
    setCassettes((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, moments: [...(c.moments ?? []), { id: createId(), time: time.trim(), text: text.trim() }], updatedAt: now }
          : c,
      ),
    );
  }, []);

  const removeMoment = useCallback((id: string, momentId: string) => {
    const now = new Date().toISOString();
    setCassettes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, moments: (c.moments ?? []).filter((m) => m.id !== momentId), updatedAt: now } : c)),
    );
  }, []);

  return {
    cassettes,
    loadProblem: initial.problem,
    saveFailed,
    add,
    update,
    setStatus,
    toggleChecklist,
    remove,
    replaceAll,
    addMany,
    loadSamples,
    removeSamples,
    clearAll,
    markOrdered,
    addMoment,
    removeMoment,
  };
}
