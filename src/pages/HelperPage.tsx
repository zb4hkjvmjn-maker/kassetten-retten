import { useEffect, useRef, useState } from 'react';
import { ServiceTeaser } from '../components/ServiceTeaser';
import { useToast } from '../components/Toast';
import { availableHandover, company } from '../config';
import type { CollectionApi } from '../hooks/useCollection';
import { href, type Route } from '../hooks/useHashRoute';
import { useStoredState } from '../hooks/useStoredState';
import {
  buildPlan,
  DEVICE_INFO,
  EMPTY_ANSWERS,
  isAnswered,
  ISSUE_LABELS,
  type HelperAnswers,
} from '../lib/helper';
import { FORMAT_HINTS, FORMAT_LABELS, STATUS_LABELS } from '../lib/labels';
import { HANDOVER_LABELS } from '../lib/order';
import { FORMAT_IDS, type FormatId } from '../lib/types';

interface StoredHelper {
  answers: HelperAnswers;
  step: number;
  done: Record<string, boolean>;
  cassetteId: string | null;
}

const INITIAL: StoredHelper = { answers: EMPTY_ANSWERS, step: 0, done: {}, cassetteId: null };
const STEP_TITLES = ['Welches Format hat die Kassette?', 'In welchem Zustand ist sie?', 'Welche Geräte hast du?', 'Dein Plan'];
const ISSUE_KEYS = Object.keys(ISSUE_LABELS) as (keyof HelperAnswers['issues'])[];

interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

function RadioGroup<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  columns = false,
}: {
  name: string;
  legend: string;
  value: T | '';
  options: RadioOption<T>[];
  onChange: (v: T) => void;
  columns?: boolean;
}) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className={`choices ${columns ? 'choices--grid' : ''}`}>
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <div key={o.value} className={`choice ${value === o.value ? 'is-selected' : ''}`}>
              <input
                type="radio"
                id={id}
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                aria-describedby={o.hint ? `${id}-hinweis` : undefined}
              />
              <div className="choice__text">
                <label htmlFor={id} className="choice__label">
                  {o.label}
                </label>
                {o.hint && (
                  <span id={`${id}-hinweis`} className="choice__hint">
                    {o.hint}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const YES_NO_UNSURE: RadioOption<'ja' | 'nein' | 'unsicher'>[] = [
  { value: 'ja', label: 'Ja' },
  { value: 'nein', label: 'Nein' },
  { value: 'unsicher', label: 'Weiß ich nicht' },
];

export function HelperPage({ api, route }: { api: CollectionApi; route: Route }) {
  const notify = useToast();
  const [state, setState] = useStoredState<StoredHelper>('kassetten-retten:helfer', INITIAL);
  const [error, setError] = useState('');
  const [planFor, setPlanFor] = useState('');
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const { answers, step } = state;
  const previousStep = useRef(step);

  const cassetteParam = route.query.get('kassette');
  const linked = state.cassetteId ? api.cassettes.find((c) => c.id === state.cassetteId) : undefined;

  // Aufruf aus einer Kassette: Format und Zustand übernehmen.
  useEffect(() => {
    if (!cassetteParam) return;
    const c = api.cassettes.find((x) => x.id === cassetteParam);
    if (!c) return;
    setState((prev) => {
      if (prev.cassetteId === c.id) return prev;
      return {
        answers: {
          ...EMPTY_ANSWERS,
          format: c.format,
          issues: { ...EMPTY_ANSWERS.issues, schimmel: c.condition === 'schimmel', band: c.condition === 'beschaedigt' },
        },
        step: 0,
        done: {},
        cassetteId: c.id,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cassetteParam]);

  // Beim Wechsel des Schritts den Fokus auf die neue Überschrift setzen.
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    stepHeading.current?.focus();
  }, [step]);

  const update = (patch: Partial<HelperAnswers>) => {
    setError('');
    setState((prev) => ({ ...prev, answers: { ...prev.answers, ...patch }, done: {} }));
  };

  const goTo = (next: number) => {
    setError('');
    setState((prev) => ({ ...prev, step: next }));
  };

  const next = () => {
    if (!isAnswered(answers, step)) {
      setError(step === 0 ? 'Bitte wähle ein Format aus – oder „Unbekannt“.' : 'Bitte beantworte alle Fragen.');
      return;
    }
    goTo(step + 1);
  };

  const restart = () => {
    setState(INITIAL);
    setError('');
    notify('Rettungshelfer zurückgesetzt.', 'hinweis');
  };

  const format: FormatId = answers.format || 'unbekannt';
  const device = DEVICE_INFO[format];
  const plan = step === 3 ? buildPlan(answers) : null;
  const candidates = api.cassettes.filter((c) => c.format === format && c.status === 'erfasst');

  return (
    <>
      <div className="page-head">
        <div>
          <h1 tabIndex={-1}>Rettungshelfer</h1>
          <p className="page-head__lead">
            Beantworte ein paar kurze Fragen. Daraus entsteht eine Checkliste für dein weiteres Vorgehen.
          </p>
        </div>
      </div>

      <aside className="notice notice--warm" aria-label="Wichtiger Hinweis">
        <div>
          <p>
            <strong>Die App digitalisiert nicht selbst.</strong> Zum Überspielen brauchst du ein passendes Abspielgerät und
            Aufnahmetechnik für den Computer – oder einen Dienstleister, der das für dich übernimmt.
          </p>
        </div>
      </aside>

      <section className="panel wizard" aria-labelledby="wizard-schritt">
        {linked && (
          <p className="wizard__for">
            Für die Kassette <a href={href(`/sammlung/${encodeURIComponent(linked.id)}`)}>„{linked.title}“</a>
          </p>
        )}
        <ol className="wizard__steps" aria-label="Fortschritt im Rettungshelfer">
          {STEP_TITLES.map((t, i) => (
            <li key={t} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="wizard__dot" aria-hidden="true">
                {i < step ? '✓' : i + 1}
              </span>
              <span className="wizard__steplabel">{['Format', 'Zustand', 'Geräte', 'Plan'][i]}</span>
            </li>
          ))}
        </ol>

        <p className="wizard__count">
          Schritt {step + 1} von {STEP_TITLES.length}
        </p>
        <h2 id="wizard-schritt" ref={stepHeading} tabIndex={-1}>
          {STEP_TITLES[step]}
        </h2>

        {step === 0 && (
          <RadioGroup<FormatId>
            name="format"
            legend="Format auswählen"
            value={answers.format}
            columns
            options={FORMAT_IDS.map((f) => ({ value: f, label: FORMAT_LABELS[f], hint: FORMAT_HINTS[f] }))}
            onChange={(v) => update({ format: v })}
          />
        )}

        {step === 0 && answers.format === 'unbekannt' && (
          <div className="notice notice--info">
            <div>
              <p>
                <strong>So bestimmst du das Format:</strong> Miss die Kassette und such nach Aufdrucken wie „VHS“, „Hi8“,
                „Video8“ oder „DV“. Auch die Beschriftung des Geräts, mit dem aufgenommen wurde, hilft weiter. Du kannst
                trotzdem fortfahren – der Plan beginnt dann mit dem Bestimmen des Formats.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <fieldset className="choice-group">
            <legend>Trifft etwas davon zu? Wähle alles Passende aus – oder nichts, wenn die Kassette unauffällig ist.</legend>
            <div className="choices choices--grid">
              {ISSUE_KEYS.map((key) => {
                const id = `zustand-${key}`;
                return (
                  <div key={key} className={`choice ${answers.issues[key] ? 'is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      id={id}
                      checked={answers.issues[key]}
                      onChange={(e) => update({ issues: { ...answers.issues, [key]: e.target.checked } })}
                      aria-describedby={`${id}-hinweis`}
                    />
                    <div className="choice__text">
                      <label htmlFor={id} className="choice__label">
                        {ISSUE_LABELS[key].label}
                      </label>
                      <span id={`${id}-hinweis`} className="choice__hint">
                        {ISSUE_LABELS[key].hint}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 1 && (answers.issues.schimmel || answers.issues.band) && (
          <div className="notice notice--danger" role="note">
            <div>
              <p>
                <strong>Bitte nicht abspielen und nicht spulen.</strong> Bei Schimmel oder beschädigtem Band kann jeder
                Versuch die Aufnahme zerstören und das Gerät verschmutzen. Lass die Kassette fachlich begutachten.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <p className="field__hint">
              Für {FORMAT_LABELS[format]} brauchst du {device.player} sowie {device.capture}.
            </p>
            <RadioGroup name="player" legend={device.playerQuestion} value={answers.player} options={YES_NO_UNSURE} onChange={(v) => update({ player: v })} />
            <RadioGroup name="capture" legend={device.captureQuestion} value={answers.capture} options={YES_NO_UNSURE} onChange={(v) => update({ capture: v })} />
            <RadioGroup
              name="computer"
              legend="Hast du einen Computer (PC oder Laptop) für die Aufnahme?"
              value={answers.computer}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
              ]}
              onChange={(v) => update({ computer: v })}
            />
            <RadioGroup
              name="diy"
              legend="Möchtest du selbst digitalisieren?"
              value={answers.diy}
              options={[
                { value: 'ja', label: 'Ja, gern', hint: 'Ich nehme mir die Zeit dafür.' },
                { value: 'nein', label: 'Lieber nicht', hint: 'Ich gebe das lieber ab.' },
                { value: 'unsicher', label: 'Weiß ich noch nicht' },
              ]}
              onChange={(v) => update({ diy: v })}
            />
          </div>
        )}

        {plan && (
          <div className="plan">
            <div className={`plan__summary plan__summary--${plan.risk}`}>
              <h3>{plan.headline}</h3>
              <p>{plan.summary}</p>
              {plan.reasons.length > 0 && (
                <ul>
                  {plan.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <h3>Deine Checkliste</h3>
            <p className="field__hint">Hake erledigte Schritte ab. Der Stand wird in diesem Browser gespeichert.</p>
            <ul className="checklist">
              {plan.steps.map((s) => {
                const id = `plan-${s.id}`;
                const checked = Boolean(state.done[s.id]);
                return (
                  <li key={s.id} className={`checklist__item ${checked ? 'is-done' : ''}`}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, done: { ...prev.done, [s.id]: e.target.checked } }))
                      }
                    />
                    <label htmlFor={id}>{s.text}</label>
                  </li>
                );
              })}
            </ul>

            {plan.route !== 'selbst' && (
              <ServiceTeaser
                title={
                  plan.route === 'fachbetrieb'
                    ? 'Wir sehen uns deine Kassette an'
                    : plan.route === 'dienstleister'
                      ? 'Wir übernehmen das für dich'
                      : 'Keine Geräte? Wir haben sie.'
                }
                text={
                  plan.route === 'fachbetrieb'
                    ? company.damagedNote
                    : 'Statt Geräte zu besorgen, kannst du die Digitalisierung an uns abgeben. Wähle die Kassetten aus deiner Sammlung und frag unverbindlich an.'
                }
                cassetteIds={linked ? [linked.id] : []}
                buttonLabel={linked ? `„${linked.title}“ digitalisieren lassen` : 'Digitalisieren lassen'}
              />
            )}
            <div className="plan__actions">
              {linked && linked.status === 'erfasst' && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    api.setStatus(linked.id, 'geplant');
                    notify(`„${linked.title}“: ${STATUS_LABELS.geplant}.`);
                  }}
                >
                  „{linked.title}“ als „Digitalisierung geplant“ markieren
                </button>
              )}
              {linked && linked.status !== 'erfasst' && (
                <p className="success-text">
                  Status von „{linked.title}“: {STATUS_LABELS[linked.status]}
                </p>
              )}
              {!linked && candidates.length > 0 && (
                <div className="plan-for">
                  <div className="field">
                    <label htmlFor="plan-fuer" className="field__label">
                      Plan für eine erfasste Kassette übernehmen
                    </label>
                    <select id="plan-fuer" value={planFor} onChange={(e) => setPlanFor(e.target.value)}>
                      <option value="">Kassette wählen …</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => {
                      const c = candidates.find((x) => x.id === planFor);
                      if (!c) {
                        notify('Bitte wähle zuerst eine Kassette aus.', 'hinweis');
                        document.getElementById('plan-fuer')?.focus();
                        return;
                      }
                      api.setStatus(c.id, 'geplant');
                      setPlanFor('');
                      notify(`„${c.title}“: ${STATUS_LABELS.geplant}.`);
                    }}
                  >
                    Als „Digitalisierung geplant“ markieren
                  </button>
                </div>
              )}
              <button type="button" className="btn btn--secondary" onClick={() => window.print()}>
                Checkliste drucken
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}

        <div className="wizard__nav">
          {step > 0 && (
            <button type="button" className="btn btn--secondary btn--large" onClick={() => goTo(step - 1)}>
              Zurück
            </button>
          )}
          {step < 3 && (
            <button type="button" className="btn btn--primary btn--large" onClick={next}>
              {step === 2 ? 'Plan anzeigen' : 'Weiter'}
            </button>
          )}
          {(step > 0 || answers.format !== '') && (
            <button type="button" className="btn btn--link" onClick={restart}>
              Neu beginnen
            </button>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="wege-titel">
        <h2 id="wege-titel">Zwei Wege im Überblick</h2>
        <div className="ways">
          <article className="panel way">
            <h3>Selbst digitalisieren</h3>
            <p>Du überspielst die Kassette mit eigenen oder geliehenen Geräten auf deinen Computer.</p>
            <h4>Das brauchst du</h4>
            <ul>
              <li>Ein funktionierendes Abspielgerät für das Format (Kassettendeck, Videorekorder oder Camcorder)</li>
              <li>Ein Aufnahmegerät für den Computer: Audio-Interface, Video-Grabber oder bei MiniDV einen FireWire-Anschluss</li>
              <li>Einen Computer mit Aufnahmeprogramm und genug Speicherplatz</li>
            </ul>
            <h4>Gut zu wissen</h4>
            <ul>
              <li>Die Überspielung läuft in Echtzeit: Eine 90-Minuten-Kassette braucht etwa 90 Minuten.</li>
              <li>Die Qualität hängt stark vom Zustand des Abspielgeräts ab.</li>
              <li>Die Kassetten bleiben bei dir zu Hause.</li>
            </ul>
          </article>
          <article className="panel way way--service">
            <h3>Von {company.brandName} digitalisieren lassen</h3>
            <p>Wir überspielen deine Kassetten und liefern dir die Dateien. Du kümmerst dich danach nur noch um die Sicherung.</p>
            <h4>So läuft es ab</h4>
            <ul>
              <li>Kassetten direkt aus deiner Sammlung auswählen und unverbindlich anfragen</li>
              <li>Angebot erhalten – erst nach deiner Zustimmung geht es los</li>
              <li>Übergabe: {availableHandover().map((h) => HANDOVER_LABELS[h].short).join(', ')}</li>
              <li>Dateien per {company.deliveryOptions.join(' oder ')}, Originale kommen zurück</li>
            </ul>
            <h4>Gut zu wissen</h4>
            <ul>
              <li>Wenig Aufwand für dich, dafür Kosten pro Kassette.</li>
              <li>{company.damagedNote}</li>
            </ul>
            <a className="btn btn--primary" href={href('/auftrag')}>
              Mehr erfahren und anfragen
            </a>
          </article>
        </div>
      </section>

      <section className="notice notice--danger" aria-labelledby="schimmel-titel">
        <div>
          <h2 id="schimmel-titel" className="notice__title">
            Schimmel oder beschädigtes Band?
          </h2>
          <p>
            Spiele die Kassette nicht ab und spule sie nicht. Lagere sie getrennt von anderen Kassetten trocken und kühl und
            lass sie von einem Fachbetrieb begutachten. Viele Bänder lassen sich fachgerecht reinigen oder reparieren und
            danach digitalisieren.
          </p>
        </div>
      </section>
    </>
  );
}
