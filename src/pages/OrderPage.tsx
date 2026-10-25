import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CassetteArt } from '../components/CassetteArt';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { availableHandover, company, configIssues } from '../config';
import type { CollectionApi } from '../hooks/useCollection';
import { href, navigate, type Route } from '../hooks/useHashRoute';
import { useStoredState } from '../hooks/useStoredState';
import { FORMAT_LABELS, RISKY_CONDITIONS } from '../lib/labels';
import {
  buildPayload,
  createOrderRef,
  EMPTY_CONTACT,
  EMPTY_DRAFT,
  HANDOVER_LABELS,
  mailtoLink,
  needsAddress,
  orderText,
  parseExtraCount,
  submitToEndpoint,
  validateContact,
  validateFinal,
  validateHandover,
  validateSelection,
  type OrderContact,
  type OrderDraft,
  type OrderErrors,
  type SentOrder,
} from '../lib/order';

const STEPS = ['Kassetten', 'Übergabe', 'Kontakt', 'Absenden'];
const DRAFT_KEY = 'kassetten-retten:auftrag-entwurf';
const HISTORY_KEY = 'kassetten-retten:auftraege';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  type?: 'text' | 'email' | 'tel';
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  multiline?: boolean;
}

function TextField({ id, label, value, onChange, error, hint, optional, type = 'text', autoComplete, inputMode, multiline }: TextFieldProps) {
  const describedBy = [error ? `${id}-fehler` : '', hint ? `${id}-hinweis` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {error && (
        <p id={`${id}-fehler`} className="field__error">
          {error}
        </p>
      )}
      {multiline ? (
        <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={error ? true : undefined} />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          inputMode={inputMode}
        />
      )}
      {hint && (
        <p id={`${id}-hinweis`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

function Address() {
  return (
    <address className="company-address">
      {company.address.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </address>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Ablauf: unverbindliche Digitalisierungsanfrage an Kassetten retten. */
export function OrderPage({ api, route }: { api: CollectionApi; route: Route }) {
  const notify = useToast();
  const [draft, setDraft] = useStoredState<OrderDraft>(DRAFT_KEY, EMPTY_DRAFT);
  const [history, setHistory] = useStoredState<SentOrder[]>(HISTORY_KEY, []);
  const [step, setStep] = useState<number | null>(null);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [mailOpened, setMailOpened] = useState(false);
  const [orderRef, setOrderRef] = useState(createOrderRef);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<number | null>(step);

  const handoverOptions = availableHandover();
  const issues = configIssues();
  const shownRef = route.query.get('gesendet');
  const sent = shownRef ? history.find((o) => o.ref === shownRef) : undefined;

  // Auswahl aus Links übernehmen, z. B. /auftrag?kassetten=a,b
  const preselect = route.query.get('kassetten');
  useEffect(() => {
    if (!preselect) return;
    const ids = preselect.split(',').filter((id) => api.cassettes.some((c) => c.id === id));
    if (ids.length === 0) return;
    setDraft((d) => ({ ...d, selected: Array.from(new Set([...d.selected, ...ids])) }));
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  // Nicht mehr vorhandene Kassetten aus der Auswahl entfernen.
  const selected = draft.selected.filter((id) => api.cassettes.some((c) => c.id === id));

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (step !== null) stepHeading.current?.focus();
  }, [step]);

  const update = (patch: Partial<OrderDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSendError('');
  };
  const updateContact = (patch: Partial<OrderContact>) => {
    setDraft((d) => ({ ...d, contact: { ...d.contact, ...patch } }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof OrderErrors];
      return next;
    });
  };

  const validators = [validateSelection, validateHandover, validateContact, validateFinal];
  const goNext = () => {
    if (step === null) return;
    const found = validators[step]({ ...draft, selected });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0];
      const target = document.getElementById(`auftrag-${firstKey}`) ?? document.querySelector<HTMLElement>('.order [role=alert]');
      target?.focus();
      return;
    }
    setStep(step + 1);
  };
  const goBack = () => {
    setErrors({});
    setStep((s) => (s === null || s === 0 ? null : s - 1));
  };

  const cassettesById = new Map(api.cassettes.map((c) => [c.id, c]));
  const chosen = selected.map((id) => cassettesById.get(id)!).filter(Boolean);
  const extra = parseExtraCount(draft.extraCount) ?? 0;
  const total = chosen.length + extra;

  const payload = buildPayload({ ...draft, selected }, api.cassettes, orderRef);

  const finalize = (method: SentOrder['method']) => {
    if (!draft.handover) return;
    const order: SentOrder = {
      ref: payload.ref,
      createdAt: new Date().toISOString(),
      method,
      handover: draft.handover,
      cassettes: payload.cassettes.map((c, i) => ({ number: c.number, id: selected[i], title: c.title, format: c.format })),
      extraCount: payload.extraCount,
    };
    setHistory((h) => [order, ...h]);
    api.markOrdered(selected, payload.ref);
    setDraft({
      ...EMPTY_DRAFT,
      contact: draft.rememberContact ? draft.contact : EMPTY_CONTACT,
      rememberContact: draft.rememberContact,
    });
    setOrderRef(createOrderRef());
    setMailOpened(false);
    setStep(null);
    navigate(`/auftrag?gesendet=${encodeURIComponent(order.ref)}`);
  };

  const checkFinal = () => {
    const found = validateFinal({ ...draft, selected });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(found.privacy ? 'auftrag-privacy' : 'auftrag-fehler')?.focus();
      return false;
    }
    return true;
  };

  const sendViaEndpoint = async () => {
    if (!checkFinal()) return;
    setSending(true);
    setSendError('');
    try {
      await submitToEndpoint(company, payload);
      notify('Anfrage gesendet. Danke!');
      finalize('formular');
    } catch {
      setSendError(
        'Die Anfrage konnte gerade nicht gesendet werden. Prüfe deine Internetverbindung und versuche es erneut – oder schick sie per E-Mail.',
      );
    } finally {
      setSending(false);
    }
  };

  const mail = mailtoLink(company.email, payload, company.brandName);

  // ---------- Bestätigung ----------
  if (sent) {
    const printSlip = () => {
      document.body.dataset.print = 'slip';
      const cleanup = () => {
        delete document.body.dataset.print;
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    };
    return (
      <div className="order">
        <div className="confirm">
          <div className="confirm__art" aria-hidden="true">
            <CassetteArt label="Unterwegs" animated />
          </div>
          <div>
            <p className="eyebrow">Anfrage {sent.method === 'formular' ? 'gesendet' : 'per E-Mail verschickt'}</p>
            <h1 tabIndex={-1}>Danke! Deine Erinnerungen sind auf dem Weg in die Zukunft.</h1>
            <p className="page-head__lead">
              Deine Auftragsnummer: <strong className="ref">{sent.ref}</strong>. Wir melden uns per E-Mail mit einem
              unverbindlichen Angebot.
            </p>
          </div>
        </div>

        <section className="panel" aria-labelledby="weiter-titel">
          <h2 id="weiter-titel">So geht es weiter</h2>
          <ol className="next-steps">
            <li>Du bekommst von uns ein Angebot. Erst wenn du zustimmst, legen wir los.</li>
            {sent.handover === 'abholung' && <li>Wir stimmen mit dir einen Abholtermin ab.</li>}
            {sent.handover === 'versand' && (
              <li>
                Verpacke die Kassetten gut gepolstert, leg den Begleitzettel bei und schick das Paket an:
                <Address />
              </li>
            )}
            {sent.handover === 'abgabe' && (
              <li>
                Bring die Kassetten mit dem Begleitzettel vorbei ({company.openingHours}):
                <Address />
              </li>
            )}
            <li>Beschrifte jede Kassette mit ihrer Nummer vom Begleitzettel, z. B. mit einem Klebezettel.</li>
            <li>Nach der Digitalisierung erhältst du deine Dateien und die Originalkassetten zurück.</li>
          </ol>
          <div className="button-row">
            <button type="button" className="btn btn--primary" onClick={printSlip}>
              Begleitzettel drucken
            </button>
            <a className="btn btn--secondary" href={href('/sammlung')}>
              Zur Sammlung
            </a>
          </div>
        </section>

        <section className="panel slip" aria-labelledby="zettel-titel">
          <h2 id="zettel-titel">Begleitzettel</h2>
          <p>
            <strong>{company.brandName}</strong> · Auftrag <strong>{sent.ref}</strong> · {new Date(sent.createdAt).toLocaleDateString('de-DE')}
          </p>
          <table className="slip__table">
            <thead>
              <tr>
                <th scope="col">Nr.</th>
                <th scope="col">Titel</th>
                <th scope="col">Format</th>
              </tr>
            </thead>
            <tbody>
              {sent.cassettes.map((c) => (
                <tr key={c.number}>
                  <td>{c.number}</td>
                  <td>{c.title}</td>
                  <td>{c.format}</td>
                </tr>
              ))}
              {sent.extraCount > 0 && (
                <tr>
                  <td>+{sent.extraCount}</td>
                  <td colSpan={2}>weitere, noch nicht erfasste Kassette(n)</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {company.support.url && (
          <aside className="notice notice--warm">
            <div>
              <p>{company.support.text}</p>
              <a className="btn btn--secondary" href={company.support.url} target="_blank" rel="noopener noreferrer">
                {company.support.label}
              </a>
            </div>
          </aside>
        )}
      </div>
    );
  }

  // ---------- Einstieg ----------
  if (step === null) {
    return (
      <div className="order">
        <section className="order-hero">
          <div>
            <p className="eyebrow">
              {company.brandName} · {company.companyName}
            </p>
            <h1 tabIndex={-1}>Wir digitalisieren deine Kassetten für dich.</h1>
            <p className="hero__lead">
              Keine Geräte, keine Zeit oder einfach lieber in erfahrenen Händen? Wähle deine Kassetten direkt aus deiner
              Sammlung, sag uns, wie sie zu uns kommen – fertig. Die Anfrage ist kostenlos und unverbindlich.
            </p>
            <div className="button-row">
              <button type="button" className="btn btn--primary btn--large" onClick={() => setStep(0)}>
                {chosen.length > 0 ? `Anfrage fortsetzen (${chosen.length} ausgewählt)` : 'Anfrage starten'}
              </button>
              <a className="btn btn--secondary btn--large" href={href('/rettungshelfer')}>
                Lieber selbst digitalisieren
              </a>
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <CassetteArt label={company.brandName} />
          </div>
        </section>

        <section className="section" aria-labelledby="ablauf-titel">
          <h2 id="ablauf-titel">So einfach geht es</h2>
          <ol className="steps">
            <li className="step">
              <span className="step__number" aria-hidden="true">1</span>
              <h3>Anfrage senden</h3>
              <p>Kassetten aus deiner Sammlung auswählen und Kontaktdaten angeben. Das dauert etwa zwei Minuten.</p>
            </li>
            <li className="step">
              <span className="step__number" aria-hidden="true">2</span>
              <h3>Angebot erhalten</h3>
              <p>Wir melden uns mit einem unverbindlichen Angebot. Erst wenn du zustimmst, geht es los.</p>
            </li>
            <li className="step">
              <span className="step__number" aria-hidden="true">3</span>
              <h3>Kassetten übergeben</h3>
              <p>
                {handoverOptions.map((h) => HANDOVER_LABELS[h].short).join(', ')} – du entscheidest. Danach bekommst du
                Dateien und Originale zurück.
              </p>
            </li>
          </ol>
        </section>

        <div className="two-col">
          <section className="panel" aria-labelledby="leistung-titel">
            <h2 id="leistung-titel">Was wir digitalisieren</h2>
            <ul className="chips">
              {company.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {company.pricing.length > 0 ? (
              <table className="price-table">
                <tbody>
                  {company.pricing.map((p) => (
                    <tr key={p.label}>
                      <th scope="row">{p.label}</th>
                      <td>{p.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Du erhältst vor Beginn ein unverbindliches Angebot für deine Kassetten.</p>
            )}
            <p className="field__hint">Lieferung der Dateien: {company.deliveryOptions.join(' oder ')}.</p>
            <p className="field__hint">{company.damagedNote}</p>
          </section>

          {history.length > 0 ? (
            <section className="panel" aria-labelledby="verlauf-titel">
              <h2 id="verlauf-titel">Deine Anfragen</h2>
              <ul className="order-history">
                {history.map((o) => (
                  <li key={o.ref}>
                    <a href={href(`/auftrag?gesendet=${encodeURIComponent(o.ref)}`)}>{o.ref}</a>
                    <span>
                      {new Date(o.createdAt).toLocaleDateString('de-DE')} · {o.cassettes.length + o.extraCount} Kassette(n) ·{' '}
                      {HANDOVER_LABELS[o.handover].label}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="field__hint">Diese Liste ist nur in diesem Browser gespeichert.</p>
            </section>
          ) : (
            <section className="panel" aria-labelledby="sicher-titel">
              <h2 id="sicher-titel">Gut zu wissen</h2>
              <ul>
                <li>Deine Sammlung bleibt in deinem Browser. Wir erhalten nur, was du in der Anfrage absendest.</li>
                <li>Kassetten, die du noch nicht erfasst hast, kannst du einfach als Anzahl angeben.</li>
                <li>Du bekommst einen Begleitzettel mit Nummern, damit keine Kassette verwechselt wird.</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    );
  }

  // ---------- Schritte ----------
  const sortedCassettes = [...api.cassettes].sort((a, b) => {
    const done = (s: string) => (s === 'digitalisiert' || s === 'gesichert' ? 1 : 0);
    return done(a.status) - done(b.status) || b.createdAt.localeCompare(a.createdAt);
  });
  const openOnes = api.cassettes.filter((c) => c.status !== 'digitalisiert' && c.status !== 'gesichert');
  const errorList = Object.values(errors).filter(Boolean);

  return (
    <div className="order">
      <p className="breadcrumb">
        <button type="button" className="btn btn--link breadcrumb__button" onClick={goBack}>
          <span aria-hidden="true">←</span> {step === 0 ? 'Zur Übersicht des Angebots' : `Zurück zu „${STEPS[step - 1]}“`}
        </button>
      </p>
      <h1 tabIndex={-1}>Digitalisierung anfragen</h1>

      <section className="panel wizard" aria-labelledby="auftrag-schritt">
        <ol className="wizard__steps" aria-label="Fortschritt der Anfrage">
          {STEPS.map((t, i) => (
            <li key={t} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="wizard__dot" aria-hidden="true">
                {i < step ? '✓' : i + 1}
              </span>
              <span className="wizard__steplabel">{t}</span>
            </li>
          ))}
        </ol>
        <p className="wizard__count">
          Schritt {step + 1} von {STEPS.length}
        </p>
        <h2 id="auftrag-schritt" ref={stepHeading} tabIndex={-1}>
          {['Welche Kassetten sollen wir digitalisieren?', 'Wie kommen die Kassetten zu uns?', 'Wie erreichen wir dich?', 'Prüfen und absenden'][step]}
        </h2>

        {errorList.length > 0 && (
          <div className="notice notice--error" role="alert" id="auftrag-fehler" tabIndex={-1}>
            <div>
              <p>
                <strong>Bitte prüfe:</strong>
              </p>
              <ul>
                {errorList.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="stack">
            {api.cassettes.length === 0 ? (
              <p>
                Deine Sammlung ist noch leer. Du kannst unten einfach angeben, wie viele Kassetten es sind – oder sie zuerst{' '}
                <a href={href('/sammlung/neu')}>in der Sammlung erfassen</a>.
              </p>
            ) : (
              <>
                <div className="pick-bar">
                  <p className="results-bar__count" aria-live="polite">
                    {chosen.length} von {api.cassettes.length} ausgewählt
                  </p>
                  <div className="button-row">
                    {openOnes.length > 0 && (
                      <button
                        type="button"
                        className="btn btn--small btn--secondary"
                        onClick={() => update({ selected: Array.from(new Set([...selected, ...openOnes.map((c) => c.id)])) })}
                      >
                        Alle noch nicht digitalisierten auswählen ({openOnes.length})
                      </button>
                    )}
                    {chosen.length > 0 && (
                      <button type="button" className="btn btn--small btn--secondary" onClick={() => update({ selected: [] })}>
                        Auswahl aufheben
                      </button>
                    )}
                  </div>
                </div>
                <fieldset className="choice-group">
                  <legend className="visually-hidden">Kassetten auswählen</legend>
                  <ul className="pick-list" id="auftrag-selected" tabIndex={-1}>
                    {sortedCassettes.map((c) => {
                      const id = `waehle-${c.id}`;
                      const checked = selected.includes(c.id);
                      return (
                        <li key={c.id} className={`choice pick ${checked ? 'is-selected' : ''}`}>
                          <input
                            type="checkbox"
                            id={id}
                            checked={checked}
                            onChange={(e) =>
                              update({ selected: e.target.checked ? [...selected, c.id] : selected.filter((x) => x !== c.id) })
                            }
                            aria-describedby={`${id}-info`}
                          />
                          <div className="choice__text">
                            <label htmlFor={id} className="choice__label">
                              {c.title}
                            </label>
                            <span id={`${id}-info`} className="choice__hint">
                              {FORMAT_LABELS[c.format]}
                              {c.year && ` · ${c.year}`}
                              {RISKY_CONDITIONS.includes(c.condition) && ' · beschädigt oder schimmelig – wir begutachten sie zuerst'}
                              {c.orderRef && ` · bereits angefragt (${c.orderRef})`}
                            </span>
                          </div>
                          <StatusBadge status={c.status} />
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              </>
            )}
            <TextField
              id="auftrag-extraCount"
              label="Weitere Kassetten, die noch nicht in der Sammlung sind"
              optional
              inputMode="numeric"
              value={draft.extraCount}
              onChange={(v) => update({ extraCount: v })}
              error={errors.extraCount}
              hint="Anzahl, z. B. 5. Du musst nicht alles vorher erfassen."
            />
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <fieldset className="choice-group" id="auftrag-handover" tabIndex={-1}>
              <legend>Übergabe wählen</legend>
              <div className="choices choices--grid">
                {handoverOptions.map((h) => (
                  <div key={h} className={`choice ${draft.handover === h ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="uebergabe"
                      id={`uebergabe-${h}`}
                      checked={draft.handover === h}
                      onChange={() => {
                        update({ handover: h });
                        setErrors({});
                      }}
                      aria-describedby={`uebergabe-${h}-hinweis`}
                    />
                    <div className="choice__text">
                      <label htmlFor={`uebergabe-${h}`} className="choice__label">
                        {HANDOVER_LABELS[h].label}
                      </label>
                      <span id={`uebergabe-${h}-hinweis`} className="choice__hint">
                        {HANDOVER_LABELS[h].hint}
                        {h === 'abholung' && ` Gebiet: ${company.pickupArea}.`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            {draft.handover === 'abholung' && (
              <TextField
                id="auftrag-pickupDates"
                label="Wann passt dir die Abholung?"
                optional
                multiline
                value={draft.pickupDates}
                onChange={(v) => update({ pickupDates: v })}
                hint="Zum Beispiel „werktags ab 17 Uhr“ oder konkrete Tage. Wir bestätigen den Termin."
              />
            )}
            {(draft.handover === 'versand' || draft.handover === 'abgabe') && (
              <div className="notice notice--info">
                <div>
                  <p>
                    <strong>{draft.handover === 'versand' ? 'Versand an:' : `Abgabe bei uns (${company.openingHours}):`}</strong>
                  </p>
                  <Address />
                  <p className="field__hint">Die Adresse steht nach dem Absenden auch auf deiner Bestätigung.</p>
                </div>
              </div>
            )}

            {company.deliveryOptions.length > 1 && (
              <fieldset className="choice-group">
                <legend>Wie möchtest du die fertigen Dateien bekommen?</legend>
                <div className="choices">
                  {[...company.deliveryOptions, 'Weiß ich noch nicht'].map((o) => (
                    <div key={o} className={`choice ${draft.delivery === o ? 'is-selected' : ''}`}>
                      <input type="radio" name="lieferung" id={`lieferung-${o}`} checked={draft.delivery === o} onChange={() => update({ delivery: o })} />
                      <div className="choice__text">
                        <label htmlFor={`lieferung-${o}`} className="choice__label">
                          {o}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <TextField id="auftrag-name" label="Name" value={draft.contact.name} onChange={(v) => updateContact({ name: v })} error={errors.name} autoComplete="name" />
            <TextField
              id="auftrag-email"
              label="E-Mail"
              type="email"
              inputMode="email"
              value={draft.contact.email}
              onChange={(v) => updateContact({ email: v })}
              error={errors.email}
              autoComplete="email"
              hint="Hierhin schicken wir das Angebot."
            />
            <TextField
              id="auftrag-phone"
              label="Telefon"
              type="tel"
              inputMode="tel"
              optional
              value={draft.contact.phone}
              onChange={(v) => updateContact({ phone: v })}
              error={errors.phone}
              autoComplete="tel"
              hint="Für Rückfragen oder den Abholtermin."
            />
            {needsAddress(draft.handover) && (
              <>
                <TextField
                  id="auftrag-street"
                  label="Straße und Hausnummer"
                  value={draft.contact.street}
                  onChange={(v) => updateContact({ street: v })}
                  error={errors.street}
                  autoComplete="street-address"
                  hint={draft.handover === 'abholung' ? 'Hier holen wir ab.' : 'Hierher schicken wir die Originale zurück.'}
                />
                <div className="form-grid__pair">
                  <TextField id="auftrag-zip" label="PLZ" inputMode="numeric" value={draft.contact.zip} onChange={(v) => updateContact({ zip: v })} error={errors.zip} autoComplete="postal-code" />
                  <TextField id="auftrag-city" label="Ort" value={draft.contact.city} onChange={(v) => updateContact({ city: v })} error={errors.city} autoComplete="address-level2" />
                </div>
              </>
            )}
            <TextField
              id="auftrag-message"
              label="Nachricht an uns"
              optional
              multiline
              value={draft.message}
              onChange={(v) => update({ message: v })}
              hint="Besondere Wünsche, z. B. ein bestimmtes Dateiformat oder eine Frist."
            />
            <div className="check-row">
              <input
                type="checkbox"
                id="auftrag-merken"
                checked={draft.rememberContact}
                onChange={(e) => update({ rememberContact: e.target.checked })}
              />
              <label htmlFor="auftrag-merken">Kontaktdaten in diesem Browser für die nächste Anfrage merken</label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            {issues.length > 0 && (
              <div className="notice notice--warm" role="note">
                <div>
                  <p>
                    <strong>Hinweis für den Betreiber:</strong> In <code>src/config.ts</code> fehlen noch: {issues.join(', ')}.
                  </p>
                </div>
              </div>
            )}
            <dl className="details summary">
              <div>
                <dt>Kassetten ({total})</dt>
                <dd>
                  <ol className="summary__list">
                    {chosen.map((c) => (
                      <li key={c.id}>
                        {c.title} <span className="muted">({FORMAT_LABELS[c.format]})</span>
                      </li>
                    ))}
                  </ol>
                  {extra > 0 && <p>+ {extra} weitere, noch nicht erfasste</p>}
                </dd>
              </div>
              <div>
                <dt>Übergabe</dt>
                <dd>
                  {draft.handover && HANDOVER_LABELS[draft.handover].label}
                  {draft.pickupDates && draft.handover === 'abholung' && ` – ${draft.pickupDates}`}
                  {draft.delivery && <><br />Dateien: {draft.delivery}</>}
                </dd>
              </div>
              <div>
                <dt>Kontakt</dt>
                <dd>
                  {draft.contact.name}, {draft.contact.email}
                  {draft.contact.phone && `, ${draft.contact.phone}`}
                  {needsAddress(draft.handover) && (
                    <>
                      <br />
                      {draft.contact.street}, {draft.contact.zip} {draft.contact.city}
                    </>
                  )}
                </dd>
              </div>
              {draft.message && (
                <div>
                  <dt>Nachricht</dt>
                  <dd className="pre-line">{draft.message}</dd>
                </div>
              )}
            </dl>
            <div className="button-row">
              {[0, 1, 2].map((s) => (
                <button key={s} type="button" className="btn btn--small btn--secondary" onClick={() => setStep(s)}>
                  {['Kassetten', 'Übergabe', 'Kontakt'][s]} ändern
                </button>
              ))}
            </div>

            <div className={`check-row ${errors.privacy ? 'check-row--error' : ''}`}>
              <input
                type="checkbox"
                id="auftrag-privacy"
                checked={draft.privacyAccepted}
                onChange={(e) => {
                  update({ privacyAccepted: e.target.checked });
                  setErrors((er) => ({ ...er, privacy: undefined }));
                }}
              />
              <label htmlFor="auftrag-privacy">
                Ich bin einverstanden, dass {company.companyName} meine Angaben zur Bearbeitung dieser Anfrage verwendet. Mehr dazu in
                den <a href={href('/datenschutz')}>Datenschutzhinweisen</a>.
              </label>
            </div>
            <p className="field__hint">
              Die Anfrage ist unverbindlich und kostenlos. Ein Auftrag kommt erst zustande, wenn du unser Angebot annimmst.
            </p>

            {sendError && (
              <p className="field__error" role="alert">
                {sendError}
              </p>
            )}

            {company.order.endpoint ? (
              <div className="button-row">
                <button type="button" className="btn btn--primary btn--large" onClick={sendViaEndpoint} disabled={sending} aria-busy={sending}>
                  {sending ? 'Wird gesendet …' : 'Unverbindlich anfragen'}
                </button>
              </div>
            ) : (
              <div className="mail-send">
                <p>
                  Die Anfrage wird mit deinem E-Mail-Programm an <strong className="selectable">{company.email}</strong> geschickt.
                </p>
                <div className="button-row">
                  <a
                    className="btn btn--primary btn--large"
                    href={mail.href}
                    onClick={(e) => {
                      if (!checkFinal()) {
                        e.preventDefault();
                        return;
                      }
                      setMailOpened(true);
                    }}
                  >
                    E-Mail mit Anfrage öffnen
                  </a>
                  <button
                    type="button"
                    className="btn btn--secondary btn--large"
                    onClick={async () => {
                      if (!checkFinal()) return;
                      const ok = await copyText(`${company.email}\n\n${orderText(payload, company.brandName)}`);
                      notify(ok ? 'Anfrage kopiert – füge sie in eine E-Mail ein.' : 'Kopieren ist hier nicht möglich. Markiere den Text unten.', ok ? 'erfolg' : 'hinweis');
                      setMailOpened(true);
                    }}
                  >
                    Anfrage als Text kopieren
                  </button>
                </div>
                {mail.truncated && (
                  <p className="field__hint">Die Liste ist lang. Kopiere den vollständigen Text und füge ihn in die E-Mail ein.</p>
                )}
                {mailOpened && (
                  <div className="notice notice--success">
                    <div>
                      <p>
                        <strong>Hast du die E-Mail abgeschickt?</strong> Dann bestätige es hier – wir vermerken die Auftragsnummer bei
                        deinen Kassetten und zeigen dir den Begleitzettel.
                      </p>
                      <button type="button" className="btn btn--primary" onClick={() => finalize('email')}>
                        Ja, E-Mail ist abgeschickt
                      </button>
                      <details className="mail-text">
                        <summary>Text der Anfrage anzeigen</summary>
                        <pre className="selectable">{orderText(payload, company.brandName)}</pre>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step < 3 && (
          <div className="wizard__nav">
            {step > 0 && (
              <button type="button" className="btn btn--secondary btn--large" onClick={goBack}>
                Zurück
              </button>
            )}
            <button type="button" className="btn btn--primary btn--large" onClick={goNext}>
              Weiter
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
