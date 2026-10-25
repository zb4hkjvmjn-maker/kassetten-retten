import { href } from '../hooks/useHashRoute';

export function NotFoundPage({ text = 'Diese Seite gibt es leider nicht.' }: { text?: string }) {
  return (
    <section className="empty">
      <h1 tabIndex={-1}>Nicht gefunden</h1>
      <p>{text}</p>
      <div className="button-row button-row--center">
        <a className="btn btn--primary" href={href('/sammlung')}>
          Zur Sammlung
        </a>
        <a className="btn btn--secondary" href={href('/')}>
          Zur Übersicht
        </a>
      </div>
    </section>
  );
}
