import { useId } from 'react';
import { checklistComplete, checklistDone, suggestFileName } from '../lib/collection';
import { CHECKLIST_ITEMS } from '../lib/labels';
import { CHECKLIST_IDS, type Cassette, type ChecklistId } from '../lib/types';
import { company } from '../config';
import { useToast } from './Toast';

interface Props {
  cassette: Cassette;
  onToggle: (item: ChecklistId, done: boolean) => void;
  onConfirm: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Fallback unten */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Sicherungscheckliste je Kassette – jeder Schritt lässt sich abhaken. */
export function BackupChecklist({ cassette, onToggle, onConfirm }: Props) {
  const notify = useToast();
  const uid = useId();
  const done = checklistDone(cassette.checklist);
  const complete = checklistComplete(cassette.checklist);
  const fileName = suggestFileName(cassette);
  const notDigitized = cassette.status === 'erfasst' || cassette.status === 'geplant' || cassette.status === 'in-bearbeitung';

  return (
    <section className="panel" aria-labelledby={`${uid}-titel`}>
      <h2 id={`${uid}-titel`}>Sicherungscheckliste</h2>
      <p className="panel__lead">
        Erst mit diesen Schritten ist eine digitalisierte Aufnahme wirklich sicher.
        {notDigitized && ' Du kannst die Schritte abhaken, sobald die Kassette digitalisiert ist.'}
      </p>

      <div
        className="progress progress--small"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={CHECKLIST_IDS.length}
        aria-valuenow={done}
        aria-valuetext={`${done} von ${CHECKLIST_IDS.length} Schritten erledigt`}
        aria-label="Fortschritt der Sicherung"
      >
        <div className="progress__bar" style={{ width: `${(done / CHECKLIST_IDS.length) * 100}%` }} />
      </div>
      <p className="progress__caption">
        {done} von {CHECKLIST_IDS.length} Schritten erledigt
      </p>

      <ul className="checklist">
        {CHECKLIST_ITEMS.map((item) => {
          const inputId = `${uid}-${item.id}`;
          return (
            <li key={item.id} className={`checklist__item ${cassette.checklist[item.id] ? 'is-done' : ''}`}>
              <input
                id={inputId}
                type="checkbox"
                checked={cassette.checklist[item.id]}
                onChange={(e) => onToggle(item.id, e.target.checked)}
                aria-describedby={`${inputId}-hinweis`}
              />
              <div>
                <label htmlFor={inputId}>{item.label}</label>
                <p id={`${inputId}-hinweis`} className="checklist__hint">
                  {item.hint}
                </p>
                {item.id === 'benannt' && (
                  <div className="filename">
                    <span className="filename__label">Vorschlag:</span>
                    <code className="filename__value">{fileName}</code>
                    <button
                      type="button"
                      className="btn btn--small btn--secondary"
                      onClick={async () => {
                        const ok = await copyText(fileName);
                        notify(ok ? 'Dateiname kopiert.' : 'Kopieren ist hier nicht möglich – bitte markiere den Namen von Hand.', ok ? 'erfolg' : 'hinweis');
                      }}
                    >
                      Kopieren
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {complete && cassette.status !== 'gesichert' && (
        <div className="notice notice--success">
          <div>
            <p>
              <strong>Alle Schritte erledigt!</strong> Möchtest du die Kassette jetzt als „Gesichert“ markieren?
            </p>
            <button type="button" className="btn btn--primary" onClick={onConfirm}>
              Sicherung bestätigen
            </button>
          </div>
        </div>
      )}
      {cassette.status === 'gesichert' && !complete && (
        <p className="field__warning">
          Die Kassette ist als „Gesichert“ markiert, aber noch nicht alle Schritte sind abgehakt.
        </p>
      )}
      {cassette.status === 'gesichert' && complete && (
        <>
          <p className="success-text">Diese Erinnerung ist gesichert. Schön, dass sie eine Zukunft hat.</p>
          {company.support.url && (
            <p className="field__hint">
              {company.support.text}{' '}
              <a href={company.support.url} target="_blank" rel="noopener noreferrer">
                {company.support.label}
              </a>
            </p>
          )}
        </>
      )}
    </section>
  );
}
