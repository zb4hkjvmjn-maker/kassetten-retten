import { href } from '../hooks/useHashRoute';
import { checklistDone } from '../lib/collection';
import { CONDITION_LABELS, FORMAT_LABELS, RISKY_CONDITIONS } from '../lib/labels';
import { CHECKLIST_IDS, type Cassette } from '../lib/types';
import { CassetteArt } from './CassetteArt';
import { StatusBadge } from './StatusBadge';

interface Props {
  cassette: Cassette;
  onDelete: (c: Cassette) => void;
  view: 'karten' | 'liste';
}

function RiskNote({ c }: { c: Cassette }) {
  if (!RISKY_CONDITIONS.includes(c.condition)) return null;
  return (
    <p className="risk-note">
      <span aria-hidden="true">⚠</span> {CONDITION_LABELS[c.condition]} – bitte nicht abspielen
    </p>
  );
}

export function CassetteCard({ cassette: c, onDelete, view }: Props) {
  const detail = href(`/sammlung/${encodeURIComponent(c.id)}`);
  const done = checklistDone(c.checklist);
  const showChecklist = c.status === 'digitalisiert' || c.status === 'gesichert' || done > 0;

  if (view === 'liste') {
    return (
      <li className="row">
        <div className="row__main">
          <h3 className="row__title">
            <a href={detail}>{c.title}</a>
            {c.sample && <span className="tag">Beispiel</span>}
          </h3>
          <p className="row__meta">
            {FORMAT_LABELS[c.format]}
            {c.year && ` · ${c.year}`}
            {c.location && ` · ${c.location}`}
          </p>
          <RiskNote c={c} />
        </div>
        <div className="row__status">
          <StatusBadge status={c.status} />
        </div>
        <div className="row__actions">
          <a className="btn btn--small btn--secondary" href={href(`/sammlung/${encodeURIComponent(c.id)}/bearbeiten`)} aria-label={`Bearbeiten: ${c.title}`}>
            Bearbeiten
          </a>
          <button type="button" className="btn btn--small btn--ghost-danger" onClick={() => onDelete(c)} aria-label={`Löschen: ${c.title}`}>
            Löschen
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="card">
      <div className="card__art">
        <CassetteArt label={FORMAT_LABELS[c.format]} />
      </div>
      <div className="card__body">
        <h3 className="card__title">
          <a href={detail} className="card__link">
            {c.title}
          </a>
        </h3>
        {c.sample && <span className="tag">Beispiel</span>}
        <StatusBadge status={c.status} />
        <dl className="card__meta">
          <div>
            <dt>Format</dt>
            <dd>{FORMAT_LABELS[c.format]}</dd>
          </div>
          {c.year && (
            <div>
              <dt>Jahr</dt>
              <dd>{c.year}</dd>
            </div>
          )}
          {c.location && (
            <div>
              <dt>Lagerort</dt>
              <dd>{c.location}</dd>
            </div>
          )}
        </dl>
        {c.content && <p className="card__content">{c.content}</p>}
        <RiskNote c={c} />
        {showChecklist && (
          <p className="card__checklist">
            Sicherung: {done} von {CHECKLIST_IDS.length} Schritten erledigt
          </p>
        )}
      </div>
      <div className="card__actions">
        <a className="btn btn--small btn--secondary" href={href(`/sammlung/${encodeURIComponent(c.id)}/bearbeiten`)} aria-label={`Bearbeiten: ${c.title}`}>
          Bearbeiten
        </a>
        <button type="button" className="btn btn--small btn--ghost-danger" onClick={() => onDelete(c)} aria-label={`Löschen: ${c.title}`}>
          Löschen
        </button>
      </div>
    </li>
  );
}
