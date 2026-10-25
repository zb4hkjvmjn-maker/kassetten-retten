import { company } from '../config';
import { href } from '../hooks/useHashRoute';
import { useStoredState } from '../hooks/useStoredState';
import { CassetteArt } from './CassetteArt';

interface Props {
  title: string;
  text: string;
  /** Kassetten, die im Auftrag schon ausgewählt sein sollen. */
  cassetteIds?: string[];
  buttonLabel?: string;
  /** Wenn gesetzt, lässt sich der Hinweis ausblenden (gemerkt im Browser). */
  dismissKey?: string;
}

/** Dezentes Angebot, die Digitalisierung an Kassetten retten abzugeben. */
export function ServiceTeaser({ title, text, cassetteIds = [], buttonLabel = 'Digitalisieren lassen', dismissKey }: Props) {
  const [dismissed, setDismissed] = useStoredState<string[]>('kassetten-retten:ausgeblendet', []);
  if (dismissKey && dismissed.includes(dismissKey)) return null;
  const target = cassetteIds.length > 0 ? `/auftrag?kassetten=${cassetteIds.map(encodeURIComponent).join(',')}` : '/auftrag';

  return (
    <aside className="teaser" aria-label={`Angebot von ${company.brandName}`}>
      <div className="teaser__art" aria-hidden="true">
        <CassetteArt />
      </div>
      <div className="teaser__body">
        <p className="teaser__eyebrow">
          {company.brandName} · {company.companyName}
        </p>
        <h2 className="teaser__title">{title}</h2>
        <p>{text}</p>
        <div className="button-row">
          <a className="btn btn--primary" href={href(target)}>
            {buttonLabel}
          </a>
          {dismissKey && (
            <button type="button" className="btn btn--link" onClick={() => setDismissed([...dismissed, dismissKey])}>
              Nicht mehr anzeigen
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
