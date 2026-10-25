import { useState } from 'react';
import { CassetteArt } from '../components/CassetteArt';
import { ChoiceGroup, copyText, PrivacyCheck, TextField } from '../components/FormBits';
import { useToast } from '../components/Toast';
import { company } from '../config';
import { href, navigate, type Route } from '../hooks/useHashRoute';
import { useStoredState } from '../hooks/useStoredState';
import { readJSON } from '../lib/storage';
import {
  createVoucherRef,
  EMPTY_CONTACT,
  EMPTY_VOUCHER,
  mailtoFor,
  sendToEndpoint,
  validateVoucher,
  voucherNeedsAddress,
  voucherText,
  type OrderContact,
  type VoucherDraft,
  type VoucherErrors,
} from '../lib/order';

interface SentVoucher {
  ref: string;
  createdAt: string;
  value: string;
  recipient: string;
  delivery: string;
}

const ORDER_DRAFT_KEY = 'kassetten-retten:auftrag-entwurf';

/** Gutschein zum Verschenken anfragen. */
export function VoucherPage({ route }: { route: Route }) {
  const notify = useToast();
  // Beim ersten Mal die Kontaktdaten aus einer früheren Anfrage übernehmen.
  const [stored, setStored] = useStoredState<VoucherDraft>('kassetten-retten:gutschein-entwurf', {
    ...EMPTY_VOUCHER,
    contact: { ...EMPTY_CONTACT, ...(readJSON<{ contact?: OrderContact } | null>(ORDER_DRAFT_KEY, null)?.contact ?? {}) },
  });
  const [history, setHistory] = useStoredState<SentVoucher[]>('kassetten-retten:gutscheine', []);
  const v: VoucherDraft = { ...EMPTY_VOUCHER, ...stored, contact: { ...EMPTY_CONTACT, ...(stored.contact ?? {}) } };
  const [errors, setErrors] = useState<VoucherErrors>({});
  const [ref, setRef] = useState(createVoucherRef);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [mailOpened, setMailOpened] = useState(false);

  const sentRef = route.query.get('gesendet');
  const sent = sentRef ? history.find((h) => h.ref === sentRef) : undefined;

  const update = (patch: Partial<VoucherDraft>) => {
    setStored({ ...v, ...patch });
    setErrors({});
    setSendError('');
  };
  const updateContact = (patch: Partial<OrderContact>) => update({ contact: { ...v.contact, ...patch } });

  const text = voucherText(v, ref, company.brandName);
  const subject = `Gutschein-Anfrage ${ref}`;
  const mail = mailtoFor(company.email, subject, text);

  const check = () => {
    const found = validateVoucher(v);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`gutschein-${first}`)?.focus();
      return false;
    }
    return true;
  };

  const finalize = () => {
    setHistory([{ ref, createdAt: new Date().toISOString(), value: v.value, recipient: v.recipient.trim(), delivery: v.delivery }, ...history]);
    setStored({ ...EMPTY_VOUCHER, contact: v.contact });
    setRef(createVoucherRef());
    setMailOpened(false);
    navigate(`/gutschein?gesendet=${encodeURIComponent(ref)}`);
  };

  const sendEndpoint = async () => {
    if (!check()) return;
    setSending(true);
    try {
      await sendToEndpoint(company, { subject, email: v.contact.email.trim(), name: v.contact.name.trim(), text, data: { ref, ...v } });
      notify('Gutschein-Anfrage gesendet. Danke!');
      finalize();
    } catch {
      setSendError('Die Anfrage konnte gerade nicht gesendet werden. Bitte versuche es erneut oder schick sie per E-Mail.');
    } finally {
      setSending(false);
    }
  };

  if (!company.voucher.enabled) {
    return (
      <section className="empty">
        <h1 tabIndex={-1}>Gutscheine</h1>
        <p>Gutscheine bieten wir derzeit nicht an.</p>
        <a className="btn btn--primary" href={href('/auftrag')}>
          Zur Anfrage
        </a>
      </section>
    );
  }

  if (sent) {
    return (
      <div className="order">
        <div className="confirm">
          <div className="confirm__art" aria-hidden="true">
            <CassetteArt label="Geschenk" animated />
          </div>
          <div>
            <p className="eyebrow">Gutschein angefragt</p>
            <h1 tabIndex={-1}>Was für ein schönes Geschenk!</h1>
            <p className="page-head__lead">
              Nummer <strong className="ref">{sent.ref}</strong> · {sent.value} für {sent.recipient}. {company.voucher.note}
            </p>
            <div className="button-row">
              <a className="btn btn--primary" href={href('/')}>
                Zur Übersicht
              </a>
              <a className="btn btn--secondary" href={href('/gutschein')}>
                Weiteren Gutschein anfragen
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const valueOptions = [
    ...company.voucher.values.map((x) => ({ value: x, label: x })),
    ...company.packages.map((p) => ({ value: `Paket ${p.name}`, label: `Paket „${p.name}“` })),
  ];
  const errorList = Object.values(errors).filter(Boolean);

  return (
    <div className="order narrow-wide">
      <div className="order-hero">
        <div>
          <p className="eyebrow">Erinnerungen verschenken</p>
          <h1 tabIndex={-1}>Gutschein anfragen</h1>
          <p className="hero__lead">
            Schenk deinen Eltern, Großeltern oder Freunden, dass ihre alten Kassetten endlich gerettet werden – als Datei
            oder als Film mit eigener Musik.
          </p>
        </div>
        <div className="hero__art" aria-hidden="true">
          <CassetteArt label="Für dich" />
        </div>
      </div>

      {errorList.length > 0 && (
        <div className="notice notice--error" role="alert">
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

      <section className="panel stack" aria-labelledby="gs-titel">
        <h2 id="gs-titel">Dein Gutschein</h2>
        <ChoiceGroup
          id="gutschein-value"
          legend="Wert oder Paket"
          layout="chips"
          value={v.value}
          error={errors.value}
          onChange={(x) => update({ value: x as string })}
          options={valueOptions}
        />
        <div className="form-grid form-grid--two">
          <TextField id="gutschein-recipient" label="Für wen?" value={v.recipient} error={errors.recipient} onChange={(x) => update({ recipient: x })} maxLength={120} />
          <TextField id="gutschein-sender" label="Von wem?" optional value={v.sender} onChange={(x) => update({ sender: x })} maxLength={120} />
        </div>
        <TextField
          id="gutschein-greeting"
          label="Persönlicher Gruß auf dem Gutschein"
          optional
          multiline
          value={v.greeting}
          error={errors.greeting}
          onChange={(x) => update({ greeting: x })}
          hint="Zum Beispiel: „Damit Papas Urlaubsvideos wieder laufen – alles Liebe zum Geburtstag!“"
          maxLength={600}
        />
        <TextField
          id="gutschein-occasionDate"
          label="Bis wann brauchst du den Gutschein?"
          optional
          value={v.occasionDate}
          onChange={(x) => update({ occasionDate: x })}
          maxLength={60}
        />
        <ChoiceGroup
          id="gutschein-delivery"
          legend="Wie soll der Gutschein zu dir kommen?"
          layout="chips"
          value={v.delivery}
          error={errors.delivery}
          onChange={(x) => update({ delivery: x as string })}
          options={company.voucher.delivery.map((x) => ({ value: x, label: x }))}
        />
      </section>

      <section className="panel" aria-labelledby="gs-kontakt">
        <h2 id="gs-kontakt">Deine Kontaktdaten</h2>
        <div className="form-grid">
          <TextField id="gutschein-name" label="Name" value={v.contact.name} error={errors.name} onChange={(x) => updateContact({ name: x })} autoComplete="name" />
          <TextField
            id="gutschein-email"
            label="E-Mail"
            type="email"
            inputMode="email"
            value={v.contact.email}
            error={errors.email}
            onChange={(x) => updateContact({ email: x })}
            autoComplete="email"
            hint="Hierhin schicken wir die Zahlungsdetails."
          />
          <TextField id="gutschein-phone" label="Telefon" type="tel" optional value={v.contact.phone} error={errors.phone} onChange={(x) => updateContact({ phone: x })} autoComplete="tel" />
          {voucherNeedsAddress(v) && (
            <>
              <TextField id="gutschein-street" label="Straße und Hausnummer" value={v.contact.street} error={errors.street} onChange={(x) => updateContact({ street: x })} autoComplete="street-address" />
              <div className="form-grid__pair">
                <TextField id="gutschein-zip" label="PLZ" inputMode="numeric" value={v.contact.zip} error={errors.zip} onChange={(x) => updateContact({ zip: x })} autoComplete="postal-code" />
                <TextField id="gutschein-city" label="Ort" value={v.contact.city} error={errors.city} onChange={(x) => updateContact({ city: x })} autoComplete="address-level2" />
              </div>
            </>
          )}
        </div>
        <PrivacyCheck id="gutschein-privacy" checked={v.privacyAccepted} error={errors.privacy} onChange={(x) => update({ privacyAccepted: x })} />
        <p className="field__hint">{company.voucher.note}</p>

        {sendError && (
          <p className="field__error" role="alert">
            {sendError}
          </p>
        )}
        {company.order.endpoint ? (
          <div className="button-row">
            <button type="button" className="btn btn--primary btn--large" onClick={sendEndpoint} disabled={sending} aria-busy={sending}>
              {sending ? 'Wird gesendet …' : 'Gutschein anfragen'}
            </button>
          </div>
        ) : (
          <div className="mail-send">
            <div className="button-row">
              <a
                className="btn btn--primary btn--large"
                href={mail.href}
                onClick={(e) => {
                  if (!check()) {
                    e.preventDefault();
                    return;
                  }
                  setMailOpened(true);
                }}
              >
                E-Mail mit Gutschein-Anfrage öffnen
              </a>
              <button
                type="button"
                className="btn btn--secondary btn--large"
                onClick={async () => {
                  if (!check()) return;
                  const ok = await copyText(`${company.email}\n\n${text}`);
                  notify(ok ? 'Anfrage kopiert – füge sie in eine E-Mail ein.' : 'Kopieren ist hier nicht möglich. Markiere den Text unten.', ok ? 'erfolg' : 'hinweis');
                  setMailOpened(true);
                }}
              >
                Als Text kopieren
              </button>
            </div>
            {mailOpened && (
              <div className="notice notice--success">
                <div>
                  <p>
                    <strong>Hast du die E-Mail abgeschickt?</strong>
                  </p>
                  <button type="button" className="btn btn--primary" onClick={finalize}>
                    Ja, E-Mail ist abgeschickt
                  </button>
                  <details className="mail-text">
                    <summary>Text der Anfrage anzeigen</summary>
                    <pre className="selectable">{text}</pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
