import { useRef, useState } from 'react';
import { BackupChecklist } from '../components/BackupChecklist';
import { CassetteArt } from '../components/CassetteArt';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import type { CollectionApi } from '../hooks/useCollection';
import { href, navigate } from '../hooks/useHashRoute';
import { CONDITION_LABELS, FORMAT_LABELS, RISKY_CONDITIONS, STATUS_HINTS, STATUS_LABELS } from '../lib/labels';
import { STATUS_IDS, type StatusId } from '../lib/types';
import { NotFoundPage } from './NotFoundPage';

export function DetailPage({ api, id }: { api: CollectionApi; id: string }) {
  const notify = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleted = useRef(false);
  const c = api.cassettes.find((x) => x.id === id);

  // Direkt nach dem Löschen nichts anzeigen, bis die Weiterleitung greift.
  if (!c && deleted.current) return null;
  if (!c) return <NotFoundPage text="Diese Kassette gibt es in deiner Sammlung nicht (mehr)." />;

  const risky = RISKY_CONDITIONS.includes(c.condition);
  const editHref = href(`/sammlung/${encodeURIComponent(c.id)}/bearbeiten`);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' });

  return (
    <>
      <p className="breadcrumb">
        <a href={href('/sammlung')}>
          <span aria-hidden="true">←</span> Zurück zur Sammlung
        </a>
      </p>

      <div className="detail-head">
        <div className="detail-head__art">
          <CassetteArt label={FORMAT_LABELS[c.format]} />
        </div>
        <div>
          <h1 tabIndex={-1}>{c.title}</h1>
          <div className="detail-head__badges">
            <StatusBadge status={c.status} />
            {c.sample && <span className="tag">Beispiel</span>}
            {c.orderRef && <span className="tag">Angefragt: {c.orderRef}</span>}
          </div>
          <div className="button-row">
            <a className="btn btn--secondary" href={editHref}>
              Bearbeiten
            </a>
            <a className="btn btn--secondary" href={href(`/rettungshelfer?kassette=${encodeURIComponent(c.id)}`)}>
              Rettungshelfer für diese Kassette
            </a>
            {(c.status === 'erfasst' || c.status === 'geplant') && !c.orderRef && (
              <a className="btn btn--primary" href={href(`/auftrag?kassetten=${encodeURIComponent(c.id)}`)}>
                Digitalisieren lassen
              </a>
            )}
            <button type="button" className="btn btn--ghost-danger" onClick={() => setConfirmDelete(true)}>
              Löschen
            </button>
          </div>
        </div>
      </div>

      {risky && (
        <div className="notice notice--danger" role="note">
          <div>
            <p>
              <strong>Bitte nicht abspielen.</strong> Diese Kassette ist als „{CONDITION_LABELS[c.condition]}“ vermerkt.
              Abspielen kann das Band und das Gerät weiter beschädigen. Lass sie von einem Fachbetrieb begutachten.
            </p>
            <a href={href(`/rettungshelfer?kassette=${encodeURIComponent(c.id)}`)}>Was jetzt zu tun ist</a>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="stack">
          <section className="panel" aria-labelledby="angaben-titel">
            <h2 id="angaben-titel">Angaben</h2>
            <dl className="details">
              <div>
                <dt>Format</dt>
                <dd>{FORMAT_LABELS[c.format]}</dd>
              </div>
              <div>
                <dt>Ungefähres Aufnahmejahr</dt>
                <dd>{c.year || <span className="muted">nicht angegeben</span>}</dd>
              </div>
              <div>
                <dt>Inhalt</dt>
                <dd className="pre-line">{c.content || <span className="muted">nicht angegeben</span>}</dd>
              </div>
              <div>
                <dt>Zustand</dt>
                <dd>{CONDITION_LABELS[c.condition]}</dd>
              </div>
              <div>
                <dt>Lagerort</dt>
                <dd>{c.location || <span className="muted">nicht angegeben</span>}</dd>
              </div>
              <div>
                <dt>Notizen</dt>
                <dd className="pre-line">{c.notes || <span className="muted">keine</span>}</dd>
              </div>
            </dl>
            <p className="field__hint">
              Erfasst am {formatDate(c.createdAt)} · zuletzt geändert am {formatDate(c.updatedAt)}
            </p>
          </section>

          <section className="panel" aria-labelledby="status-titel">
            <h2 id="status-titel">Status ändern</h2>
            <div className="field">
              <label htmlFor="status-schnell" className="field__label">
                Wie weit ist diese Kassette?
              </label>
              <select
                id="status-schnell"
                value={c.status}
                aria-describedby="status-schnell-hinweis"
                onChange={(e) => {
                  const status = e.target.value as StatusId;
                  api.setStatus(c.id, status);
                  notify(`Status geändert: ${STATUS_LABELS[status]}.`);
                }}
              >
                {STATUS_IDS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <p id="status-schnell-hinweis" className="field__hint">
                {STATUS_HINTS[c.status]}
              </p>
            </div>
          </section>
        </div>

        <BackupChecklist
          cassette={c}
          onToggle={(item, done) => api.toggleChecklist(c.id, item, done)}
          onConfirm={() => {
            api.setStatus(c.id, 'gesichert');
            notify(`„${c.title}“ ist jetzt gesichert.`);
          }}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Kassette löschen?"
        onCancel={() => setConfirmDelete(false)}
        actions={[
          {
            label: 'Endgültig löschen',
            variant: 'danger',
            onClick: () => {
              setConfirmDelete(false);
              deleted.current = true;
              api.remove(c.id);
              notify(`„${c.title}“ wurde gelöscht.`);
              navigate('/sammlung');
            },
          },
        ]}
      >
        <p>„{c.title}“ wird aus deiner Sammlung entfernt. Das kann nicht rückgängig gemacht werden.</p>
      </ConfirmDialog>
    </>
  );
}
