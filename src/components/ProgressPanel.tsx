import { href } from '../hooks/useHashRoute';
import { STATUS_LABELS } from '../lib/labels';
import { computeStats, nextAction } from '../lib/progress';
import { STATUS_IDS, type Cassette } from '../lib/types';

interface Props {
  cassettes: Cassette[];
}

/** Fortschritt der Sammlung mit Zahlen, Balken und passender nächster Aktion. */
export function ProgressPanel({ cassettes }: Props) {
  const stats = computeStats(cassettes);
  const action = nextAction(cassettes);

  return (
    <section className="panel progress-panel" aria-labelledby="fortschritt-titel">
      <h2 id="fortschritt-titel">Dein Fortschritt</h2>

      {stats.total > 0 && (
        <>
          <dl className="stats">
            <div className="stat">
              <dt>Kassetten insgesamt</dt>
              <dd>{stats.total}</dd>
            </div>
            <div className="stat">
              <dt>Digitalisiert</dt>
              <dd>{stats.digitized}</dd>
            </div>
            <div className="stat stat--accent">
              <dt>Gesichert</dt>
              <dd>{stats.secured}</dd>
            </div>
          </dl>

          <div
            className="progress"
            role="progressbar"
            aria-label="Gesicherte Kassetten"
            aria-valuemin={0}
            aria-valuemax={stats.total}
            aria-valuenow={stats.secured}
            aria-valuetext={`${stats.secured} von ${stats.total} Kassetten gesichert`}
          >
            <div className="progress__bar progress__bar--digitized" style={{ width: `${stats.digitizedPercent}%` }} />
            <div className="progress__bar" style={{ width: `${stats.securedPercent}%` }} />
          </div>
          <p className="progress__caption">
            <strong>
              {stats.secured} von {stats.total}
            </strong>{' '}
            {stats.total === 1 ? 'Kassette ist' : 'Kassetten sind'} gesichert ({stats.securedPercent} %).{' '}
            {stats.digitized > stats.secured &&
              `${stats.digitized - stats.secured} weitere ${stats.digitized - stats.secured === 1 ? 'ist' : 'sind'} digitalisiert und ${stats.digitized - stats.secured === 1 ? 'wartet' : 'warten'} auf die Sicherung.`}
          </p>
          <div className="legend" aria-hidden="true">
            <span>
              <i className="legend__swatch legend__swatch--secured" /> Gesichert
            </span>
            <span>
              <i className="legend__swatch legend__swatch--digitized" /> Digitalisiert
            </span>
          </div>

          <ul className="status-list">
            {STATUS_IDS.map((s) => (
              <li key={s}>
                <a href={href(`/sammlung?status=${s}`)}>
                  <span className={`badge__dot badge__dot--${s}`} aria-hidden="true" />
                  <span className="status-list__label">{STATUS_LABELS[s]}</span>
                  <span className="status-list__count">{stats.byStatus[s]}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="next-action">
        <p className="next-action__eyebrow">Nächster Schritt</p>
        <h3 className="next-action__title">{action.title}</h3>
        <p>{action.text}</p>
        <a className="btn btn--primary" href={href(action.href)}>
          {action.label}
        </a>
      </div>
    </section>
  );
}
