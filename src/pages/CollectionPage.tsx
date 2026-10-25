import { useEffect, useMemo, useRef, useState } from 'react';
import { CassetteCard } from '../components/CassetteCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataPanel } from '../components/DataPanel';
import { ServiceTeaser } from '../components/ServiceTeaser';
import { StorageNotice } from '../components/StorageNotice';
import { useToast } from '../components/Toast';
import type { CollectionApi } from '../hooks/useCollection';
import { href, type Route } from '../hooks/useHashRoute';
import { useStoredState } from '../hooks/useStoredState';
import { DEFAULT_FILTER, filterCassettes, sortCassettes, type CollectionFilter } from '../lib/collection';
import { FORMAT_LABELS, STATUS_LABELS } from '../lib/labels';
import { FORMAT_IDS, STATUS_IDS, type Cassette, type FormatId, type StatusId } from '../lib/types';

interface Props {
  api: CollectionApi;
  route: Route;
}

export function CollectionPage({ api, route }: Props) {
  const notify = useToast();
  const [filter, setFilter] = useStoredState<CollectionFilter>('kassetten-retten:filter', DEFAULT_FILTER, 'session');
  const [view, setView] = useStoredState<'karten' | 'liste'>('kassetten-retten:ansicht', 'karten');
  const [toDelete, setToDelete] = useState<Cassette | null>(null);
  const dataPanel = useRef<HTMLElement>(null);

  const statusParam = route.query.get('status');
  const formatParam = route.query.get('format');
  const section = route.query.get('bereich');

  // Filter aus Links (z. B. von der Übersicht) übernehmen.
  useEffect(() => {
    if (statusParam && (STATUS_IDS as readonly string[]).includes(statusParam)) {
      setFilter({ ...DEFAULT_FILTER, status: statusParam as StatusId });
    } else if (formatParam && (FORMAT_IDS as readonly string[]).includes(formatParam)) {
      setFilter({ ...DEFAULT_FILTER, format: formatParam as FormatId });
    }
  }, [statusParam, formatParam, setFilter]);

  const scrollToData = () => {
    const el = dataPanel.current;
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (section === 'sicherung') window.setTimeout(scrollToData, 50);
  }, [section]);

  const results = useMemo(() => sortCassettes(filterCassettes(api.cassettes, filter)), [api.cassettes, filter]);
  const isFiltered = filter.query !== '' || filter.format !== 'alle' || filter.status !== 'alle';
  const total = api.cassettes.length;
  const waiting = api.cassettes.filter((c) => (c.status === 'erfasst' || c.status === 'geplant') && !c.orderRef && !c.sample);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 tabIndex={-1}>Meine Sammlung</h1>
          <p className="page-head__lead">
            {total === 0
              ? 'Hier sammelst du alle Kassetten, die du retten möchtest.'
              : `${total} ${total === 1 ? 'Kassette' : 'Kassetten'} erfasst.`}
          </p>
        </div>
        <a className="btn btn--primary btn--large" href={href('/sammlung/neu')}>
          <span aria-hidden="true">＋</span> Kassette hinzufügen
        </a>
      </div>

      <StorageNotice compact onBackupClick={scrollToData} />

      {total === 0 ? (
        <section className="empty">
          <h2>Noch keine Kassetten erfasst</h2>
          <p>
            Fang mit einer Kassette an, die dir besonders am Herzen liegt. Titel und Format genügen – alles andere kannst du
            später ergänzen.
          </p>
          <div className="button-row button-row--center">
            <a className="btn btn--primary btn--large" href={href('/sammlung/neu')}>
              Erste Kassette erfassen
            </a>
            <button
              type="button"
              className="btn btn--secondary btn--large"
              onClick={() => notify(`${api.loadSamples()} Beispielkassetten geladen.`)}
            >
              Beispieldaten laden
            </button>
          </div>
          <p className="field__hint">Beispieldaten sind erfunden, als „Beispiel“ markiert und lassen sich wieder entfernen.</p>
        </section>
      ) : (
        <>
          <section className="toolbar" aria-label="Suchen und filtern">
            <div className="field toolbar__search">
              <label htmlFor="suche" className="field__label">
                Suchen
              </label>
              <input
                id="suche"
                type="search"
                value={filter.query}
                onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                placeholder="Titel, Inhalt, Jahr, Lagerort …"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="filter-format" className="field__label">
                Format
              </label>
              <select
                id="filter-format"
                value={filter.format}
                onChange={(e) => setFilter({ ...filter, format: e.target.value as FormatId | 'alle' })}
              >
                <option value="alle">Alle Formate</option>
                {FORMAT_IDS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filter-status" className="field__label">
                Status
              </label>
              <select
                id="filter-status"
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as StatusId | 'alle' })}
              >
                <option value="alle">Alle Status</option>
                {STATUS_IDS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar__view" role="group" aria-label="Ansicht">
              <button type="button" className="toggle" aria-pressed={view === 'karten'} onClick={() => setView('karten')}>
                Karten
              </button>
              <button type="button" className="toggle" aria-pressed={view === 'liste'} onClick={() => setView('liste')}>
                Liste
              </button>
            </div>
          </section>

          {waiting.length > 0 && (
            <ServiceTeaser
              title={`${waiting.length} ${waiting.length === 1 ? 'Kassette wartet' : 'Kassetten warten'} auf die Digitalisierung`}
              text="Du kannst sie selbst überspielen – oder du gibst sie uns. Die ausgewählten Kassetten übernehmen wir direkt in deine Anfrage."
              cassetteIds={waiting.map((c) => c.id)}
              buttonLabel={waiting.length === 1 ? 'Diese Kassette digitalisieren lassen' : `Alle ${waiting.length} digitalisieren lassen`}
              dismissKey="sammlung"
            />
          )}

          <div className="results-bar">
            <p aria-live="polite" className="results-bar__count">
              {isFiltered ? `${results.length} von ${total} Kassetten gefunden` : `${total} ${total === 1 ? 'Kassette' : 'Kassetten'}`}
            </p>
            {isFiltered && (
              <button type="button" className="btn btn--small btn--secondary" onClick={() => setFilter(DEFAULT_FILTER)}>
                Filter zurücksetzen
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <section className="empty empty--small">
              <h2>Keine passende Kassette gefunden</h2>
              <p>Versuche einen anderen Suchbegriff oder setze die Filter zurück.</p>
            </section>
          ) : (
            <ul className={view === 'karten' ? 'card-grid' : 'row-list'} aria-label="Kassetten">
              {results.map((c) => (
                <CassetteCard key={c.id} cassette={c} view={view} onDelete={setToDelete} />
              ))}
            </ul>
          )}
        </>
      )}

      <DataPanel api={api} ref={dataPanel} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Kassette löschen?"
        onCancel={() => setToDelete(null)}
        actions={[
          {
            label: 'Endgültig löschen',
            variant: 'danger',
            onClick: () => {
              if (toDelete) {
                api.remove(toDelete.id);
                notify(`„${toDelete.title}“ wurde gelöscht.`);
              }
              setToDelete(null);
            },
          },
        ]}
      >
        <p>„{toDelete?.title}“ wird aus deiner Sammlung entfernt. Das kann nicht rückgängig gemacht werden.</p>
      </ConfirmDialog>
    </>
  );
}
