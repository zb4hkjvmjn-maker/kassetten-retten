import { useEffect, useRef, useState } from 'react';
import { CassetteArt } from '../components/CassetteArt';
import { Address, ChoiceGroup, copyText, PrivacyCheck, TextField } from '../components/FormBits';
import { PackageCards } from '../components/PackageCards';
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
  findPackage,
  HANDOVER_LABELS,
  mailtoLink,
  needsAddress,
  normalizeDraft,
  orderText,
  parseExtraCount,
  STEP_LABELS,
  stepsFor,
  submitToEndpoint,
  validateContact,
  validateFilm,
  validateFinal,
  validateHandover,
  validateMusic,
  validatePackage,
  validateSelection,
  type FilmBrief,
  type MusicBrief,
  type OrderContact,
  type OrderDraft,
  type OrderErrors,
  type SentOrder,
  type StepId,
} from '../lib/order';

const DRAFT_KEY = 'kassetten-retten:auftrag-entwurf';
const HISTORY_KEY = 'kassetten-retten:auftraege';

/** Ablauf: unverbindliche Digitalisierungsanfrage an Kassetten retten. */
export function OrderPage({ api, route }: { api: CollectionApi; route: Route }) {
  const notify = useToast();
  const [storedDraft, setDraft] = useStoredState<OrderDraft>(DRAFT_KEY, EMPTY_DRAFT);
  const draft = normalizeDraft(storedDraft);
  const [history, setHistory] = useStoredState<SentOrder[]>(HISTORY_KEY, []);
  const [stepId, setStepId] = useState<StepId | null>(null);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [mailOpened, setMailOpened] = useState(false);
  const [orderRef, setOrderRef] = useState(createOrderRef);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<StepId | null>(stepId);
  const steps = stepsFor(company, draft);
  const step = stepId === null ? null : Math.max(0, steps.indexOf(stepId));
  const current: StepId | null = step === null ? null : steps[step];
  const pkg = findPackage(company, draft.packageId);

  const handoverOptions = availableHandover();
  const issues = configIssues();
  const shownRef = route.query.get('gesendet');
  const sent = shownRef ? history.find((o) => o.ref === shownRef) : undefined;

  // Auswahl aus Links übernehmen, z. B. /auftrag?kassetten=a,b&paket=erinnerungsfilm
  const preselect = route.query.get('kassetten');
  const prePackage = route.query.get('paket');
  useEffect(() => {
    const ids = preselect ? preselect.split(',').filter((id) => api.cassettes.some((c) => c.id === id)) : [];
    const packageOk = prePackage && findPackage(company, prePackage);
    if (ids.length === 0 && !packageOk) return;
    setDraft((d) => {
      const n = normalizeDraft(d);
      return {
        ...n,
        selected: Array.from(new Set([...n.selected, ...ids])),
        packageId: packageOk ? prePackage : n.packageId,
      };
    });
    setStepId('kassetten');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, prePackage]);

  // Nicht mehr vorhandene Kassetten aus der Auswahl entfernen.
  const selected = draft.selected.filter((id) => api.cassettes.some((c) => c.id === id));

  useEffect(() => {
    if (previousStep.current === stepId) return;
    previousStep.current = stepId;
    if (stepId !== null) stepHeading.current?.focus();
  }, [stepId]);

  const update = (patch: Partial<OrderDraft>) => {
    setDraft((d) => ({ ...normalizeDraft(d), ...patch }));
    setSendError('');
  };
  const updateFilm = (patch: Partial<FilmBrief>) => {
    setDraft((d) => {
      const n = normalizeDraft(d);
      return { ...n, film: { ...n.film, ...patch } };
    });
    setErrors({});
  };
  const updateMusic = (patch: Partial<MusicBrief>) => {
    setDraft((d) => {
      const n = normalizeDraft(d);
      return { ...n, music: { ...n.music, ...patch } };
    });
    setErrors({});
  };
  const updateContact = (patch: Partial<OrderContact>) => {
    setDraft((d) => {
      const n = normalizeDraft(d);
      return { ...n, contact: { ...n.contact, ...patch } };
    });
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof OrderErrors];
      return next;
    });
  };

  const validators: Record<StepId, (d: OrderDraft) => OrderErrors> = {
    kassetten: validateSelection,
    paket: (d) => validatePackage(d, company),
    film: validateFilm,
    musik: validateMusic,
    uebergabe: validateHandover,
    kontakt: validateContact,
    absenden: (d) => validateFinal(d, company),
  };
  const goNext = () => {
    if (step === null || current === null) return;
    const found = validators[current]({ ...draft, selected });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0];
      const target = document.getElementById(`auftrag-${firstKey}`) ?? document.querySelector<HTMLElement>('.order [role=alert]');
      target?.focus();
      return;
    }
    setStepId(steps[step + 1] ?? 'absenden');
  };
  const goBack = () => {
    setErrors({});
    setStepId(step === null || step === 0 ? null : steps[step - 1]);
  };
  const goTo = (id: StepId) => {
    setErrors({});
    setStepId(id);
  };

  const cassettesById = new Map(api.cassettes.map((c) => [c.id, c]));
  const chosen = selected.map((id) => cassettesById.get(id)!).filter(Boolean);
  const extra = parseExtraCount(draft.extraCount) ?? 0;
  const total = chosen.length + extra;

  const payload = buildPayload({ ...draft, selected }, api.cassettes, orderRef, new Date(), company);

  const finalize = (method: SentOrder['method']) => {
    if (!draft.handover) return;
    const order: SentOrder = {
      ref: payload.ref,
      createdAt: new Date().toISOString(),
      method,
      handover: draft.handover,
      packageName: pkg?.name,
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
    setStepId(null);
    navigate(`/auftrag?gesendet=${encodeURIComponent(order.ref)}`);
  };

  const checkFinal = () => {
    const found = validateFinal({ ...draft, selected }, company);
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
              Deine Auftragsnummer: <strong className="ref">{sent.ref}</strong>
              {sent.packageName && <> · Paket {sent.packageName}</>}. Wir melden uns per E-Mail mit einem unverbindlichen
              Angebot.
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
              Keine Geräte, keine Zeit oder Lust auf mehr als eine Kopie? Wähle deine Kassetten direkt aus deiner Sammlung –
              als Datei, aufgeräumt oder als Film mit Musik. Die Anfrage ist kostenlos und unverbindlich.
            </p>
            <div className="button-row">
              <button type="button" className="btn btn--primary btn--large" onClick={() => setStepId('kassetten')}>
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

        <section className="section" aria-labelledby="pakete-titel">
          <h2 id="pakete-titel">Mehr als eine Kopie</h2>
          <p className="section__lead">
            Von der 1:1-Digitalisierung bis zum Film mit eigens erstellter Musik – wähle, was aus deinen Erinnerungen werden soll.
          </p>
          <PackageCards
            packages={company.packages}
            onSelect={(id) => {
              update({ packageId: id });
              setStepId('kassetten');
            }}
          />
          {company.voucher.enabled && (
            <p className="voucher-link">
              Lieber verschenken? <a href={href('/gutschein')}>Gutschein anfragen</a>
            </p>
          )}
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
          <span aria-hidden="true">←</span> {step === 0 ? 'Zur Übersicht des Angebots' : `Zurück zu „${STEP_LABELS[steps[step - 1]].short}“`}
        </button>
      </p>
      <h1 tabIndex={-1}>Digitalisierung anfragen</h1>

      <section className="panel wizard" aria-labelledby="auftrag-schritt">
        <ol className="wizard__steps" aria-label="Fortschritt der Anfrage">
          {steps.map((id, i) => (
            <li key={id} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="wizard__dot" aria-hidden="true">
                {i < step ? '✓' : i + 1}
              </span>
              <span className="wizard__steplabel">{STEP_LABELS[id].short}</span>
            </li>
          ))}
        </ol>
        <p className="wizard__count">
          Schritt {step + 1} von {steps.length}
        </p>
        <h2 id="auftrag-schritt" ref={stepHeading} tabIndex={-1}>
          {current && STEP_LABELS[current].title}
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

        {current === 'kassetten' && (
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

        {current === 'paket' && (
          <div className="stack">
            <PackageCards
              packages={company.packages}
              selected={draft.packageId}
              error={errors.packageId}
              onSelect={(id) => {
                update({ packageId: id });
                setErrors({});
              }}
            />
            {company.extras.length > 0 && (
              <ChoiceGroup
                id="auftrag-extras"
                legend="Extras dazu?"
                hint="Optional – frei kombinierbar."
                multiple
                value={draft.extras}
                onChange={(v) => update({ extras: v as string[] })}
                options={company.extras.map((x) => ({ value: x.id, label: x.name, hint: x.price || undefined }))}
              />
            )}
            {company.deadlineNote && <p className="notice notice--warm deadline-note">{company.deadlineNote}</p>}
          </div>
        )}

        {current === 'film' && (
          <div className="stack">
            <ChoiceGroup
              id="auftrag-occasion"
              legend="Für welchen Anlass ist der Film?"
              layout="chips"
              value={draft.film.occasion}
              error={errors.occasion}
              onChange={(v) => updateFilm({ occasion: v as string })}
              options={company.film.occasions.map((o) => ({ value: o, label: o }))}
            />
            <div className="form-grid">
              <TextField
                id="auftrag-forWhom"
                label="Für wen ist der Film?"
                optional
                value={draft.film.forWhom}
                onChange={(v) => updateFilm({ forWhom: v })}
                hint="Zum Beispiel „Oma Maria zum 80er“ oder „unsere Kinder“."
                maxLength={200}
              />
              <TextField
                id="auftrag-date"
                label="Bis wann brauchst du den Film?"
                optional
                value={draft.film.date}
                onChange={(v) => updateFilm({ date: v })}
                hint="Ein Datum oder z. B. „vor Weihnachten“."
                maxLength={60}
              />
            </div>
            <ChoiceGroup
              id="auftrag-length"
              legend="Wie lang soll der Film ungefähr werden?"
              layout="chips"
              value={draft.film.length}
              onChange={(v) => updateFilm({ length: v as string })}
              options={company.film.lengths.map((o) => ({ value: o, label: o }))}
            />
            <TextField
              id="auftrag-filmMessage"
              label="Persönliche Botschaft"
              optional
              multiline
              rows={4}
              value={draft.film.message}
              error={errors.filmMessage}
              onChange={(v) => updateFilm({ message: v })}
              hint="Ein Gruß, ein Dank, ein Glückwunsch – so, wie du es sagen würdest."
            />
            {draft.film.message.trim() && (
              <ChoiceGroup
                id="auftrag-messageStyle"
                legend="Wie soll die Botschaft erscheinen?"
                layout="chips"
                value={draft.film.messageStyle}
                onChange={(v) => updateFilm({ messageStyle: v as string })}
                options={company.film.messageStyles.filter((m) => !/^ohne/i.test(m)).map((o) => ({ value: o, label: o }))}
              />
            )}
            <div className="check-row">
              <input type="checkbox" id="auftrag-photos" checked={draft.film.photos} onChange={(e) => updateFilm({ photos: e.target.checked })} />
              <label htmlFor="auftrag-photos">Ich möchte auch Fotos einbauen lassen (wir besprechen mit dir, wie du sie uns schickst)</label>
            </div>
            {chosen.some((c) => (c.moments ?? []).length > 0) ? (
              <div className="moments-summary">
                <h3>Deine Lieblingsmomente kommen mit</h3>
                <ul>
                  {chosen.flatMap((c) =>
                    (c.moments ?? []).map((m) => (
                      <li key={m.id}>
                        <strong>{c.title}:</strong> {m.time && `${m.time} – `}
                        {m.text}
                      </li>
                    )),
                  )}
                </ul>
              </div>
            ) : (
              <p className="field__hint">
                Tipp: In deiner Sammlung kannst du bei jeder Kassette Lieblingsmomente notieren. Sie werden automatisch mitgeschickt.
              </p>
            )}
          </div>
        )}

        {current === 'musik' && (
          <div className="stack">
            <p className="notice notice--info music-note">{company.music.note}</p>
            <ChoiceGroup
              id="auftrag-moods"
              legend="Welche Stimmung soll die Musik haben?"
              hint="Mehrfachauswahl möglich."
              layout="chips"
              multiple
              value={draft.music.moods}
              error={errors.moods}
              onChange={(v) => updateMusic({ moods: v as string[] })}
              options={company.music.moods.map((o) => ({ value: o, label: o }))}
            />
            <ChoiceGroup
              id="auftrag-genre"
              legend="Welcher Musikstil passt?"
              layout="chips"
              value={draft.music.genre}
              onChange={(v) => updateMusic({ genre: v as string })}
              options={[...company.music.genres, 'Überrascht mich'].map((o) => ({ value: o, label: o }))}
            />
            <ChoiceGroup
              id="auftrag-tempo"
              legend="Tempo"
              layout="chips"
              value={draft.music.tempo}
              onChange={(v) => updateMusic({ tempo: v as string })}
              options={company.music.tempos.map((o) => ({ value: o, label: o }))}
            />
            <ChoiceGroup
              id="auftrag-instruments"
              legend="Lieblingsinstrumente"
              hint="Optional, Mehrfachauswahl möglich."
              layout="chips"
              multiple
              value={draft.music.instruments}
              onChange={(v) => updateMusic({ instruments: v as string[] })}
              options={company.music.instruments.map((o) => ({ value: o, label: o }))}
            />
            <ChoiceGroup
              id="auftrag-vocals"
              legend="Gesang"
              value={draft.music.vocals}
              error={errors.vocals}
              onChange={(v) => updateMusic({ vocals: v as MusicBrief['vocals'] })}
              options={company.music.vocals.map((o) => ({
                value: o.id,
                label: o.label,
                hint: o.id === 'persoenlich' && company.music.personalSongPrice ? `${o.hint} Aufpreis: ${company.music.personalSongPrice}` : o.hint,
              }))}
            />
            {draft.music.vocals && draft.music.vocals !== 'instrumental' && (
              <ChoiceGroup
                id="auftrag-language"
                legend="Sprache des Gesangs"
                layout="chips"
                value={draft.music.language}
                onChange={(v) => updateMusic({ language: v as string })}
                options={company.music.languages.map((o) => ({ value: o, label: o }))}
              />
            )}
            {draft.music.vocals === 'persoenlich' && (
              <div className="lyrics" id="auftrag-lyrics" tabIndex={-1}>
                <h3>Dein persönliches Lied</h3>
                {errors.lyrics && <p className="field__error">{errors.lyrics}</p>}
                <TextField
                  id="auftrag-names"
                  label="Wer kommt im Lied vor?"
                  value={draft.music.names}
                  onChange={(v) => updateMusic({ names: v })}
                  hint="Namen, Spitznamen, z. B. „Oma Resi und Opa Franz“."
                  maxLength={200}
                />
                <TextField
                  id="auftrag-story"
                  label="Worum soll es gehen?"
                  multiline
                  rows={4}
                  value={draft.music.story}
                  onChange={(v) => updateMusic({ story: v })}
                  hint="Ein paar Erinnerungen, Eigenheiten oder Geschichten – je persönlicher, desto schöner."
                  maxLength={1500}
                />
                <TextField
                  id="auftrag-words"
                  label="Worte oder Sätze, die vorkommen sollen"
                  optional
                  value={draft.music.words}
                  onChange={(v) => updateMusic({ words: v })}
                  maxLength={300}
                />
              </div>
            )}
            <TextField
              id="auftrag-musicNotes"
              label="Sonst noch Wünsche zur Musik?"
              optional
              multiline
              value={draft.music.notes}
              onChange={(v) => updateMusic({ notes: v })}
              hint="Beschreib in eigenen Worten, wie es klingen soll – z. B. „wie ein Abend auf der Terrasse“."
              maxLength={800}
            />
          </div>
        )}

        {current === 'uebergabe' && (
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

        {current === 'kontakt' && (
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

        {current === 'absenden' && (
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
              {pkg && (
                <div>
                  <dt>Paket</dt>
                  <dd>
                    {pkg.name}
                    {pkg.price && <span className="muted"> · {pkg.price}</span>}
                    {payload.extras.length > 0 && (
                      <>
                        <br />
                        Extras: {payload.extras.join(', ')}
                      </>
                    )}
                  </dd>
                </div>
              )}
              {payload.film && (
                <div>
                  <dt>Film</dt>
                  <dd>
                    {[payload.film.occasion, payload.film.forWhom && `für ${payload.film.forWhom}`, payload.film.length, payload.film.date && `bis ${payload.film.date}`]
                      .filter(Boolean)
                      .join(' · ')}
                    {payload.film.message && <span className="block pre-line">„{payload.film.message}“</span>}
                  </dd>
                </div>
              )}
              {payload.music && (
                <div>
                  <dt>Musik</dt>
                  <dd>
                    {[payload.music.moods.join(', '), payload.music.genre, payload.music.tempo, payload.music.vocals].filter(Boolean).join(' · ')}
                    {payload.music.names && <span className="block">Im Lied: {payload.music.names}</span>}
                  </dd>
                </div>
              )}
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
              {steps
                .filter((id) => id !== 'absenden')
                .map((id) => (
                  <button key={id} type="button" className="btn btn--small btn--secondary" onClick={() => goTo(id)}>
                    {STEP_LABELS[id].short} ändern
                  </button>
                ))}
            </div>

            <PrivacyCheck
              id="auftrag-privacy"
              checked={draft.privacyAccepted}
              error={errors.privacy}
              onChange={(v) => {
                update({ privacyAccepted: v });
                setErrors((er) => ({ ...er, privacy: undefined }));
              }}
            />
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

        {current !== 'absenden' && (
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
