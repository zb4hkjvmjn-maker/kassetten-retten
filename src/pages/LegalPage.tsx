import { company } from '../config';

/** Impressum und Datenschutzhinweise. Inhalte kommen aus src/config.ts – bitte rechtlich prüfen lassen. */
export function LegalPage({ kind }: { kind: 'impressum' | 'datenschutz' }) {
  if (kind === 'impressum') {
    const i = company.imprint;
    return (
      <div className="narrow legal">
        <h1 tabIndex={-1}>Impressum</h1>
        <p>Informationen nach § 5 E-Commerce-Gesetz und Offenlegung nach § 25 Mediengesetz.</p>
        <dl className="details">
          <div>
            <dt>Medieninhaber und Betreiber</dt>
            <dd>
              {i.owner}
              <br />
              {company.companyName}
            </dd>
          </div>
          <div>
            <dt>Anschrift</dt>
            <dd>
              {company.address.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>Kontakt</dt>
            <dd>
              E-Mail: <span className="selectable">{company.email}</span>
              <br />
              Telefon: <span className="selectable">{company.phone}</span>
            </dd>
          </div>
          <div>
            <dt>Unternehmensgegenstand</dt>
            <dd>{i.businessPurpose}</dd>
          </div>
          <div>
            <dt>UID-Nummer</dt>
            <dd>{i.vatId}</dd>
          </div>
          <div>
            <dt>Firmenbuch</dt>
            <dd>{i.companyRegister}</dd>
          </div>
          <div>
            <dt>Aufsichtsbehörde</dt>
            <dd>{i.authority}</dd>
          </div>
          <div>
            <dt>Kammer</dt>
            <dd>{i.chamber}</dd>
          </div>
          <div>
            <dt>Grundlegende Richtung</dt>
            <dd>Information und Hilfe zur Rettung alter Audio- und Videokassetten sowie Angebot zur Digitalisierung.</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="narrow legal">
      <h1 tabIndex={-1}>Datenschutz</h1>

      <h2>Kurz gesagt</h2>
      <p>
        Deine Kassettensammlung bleibt in deinem Browser. Es gibt keine Konten, keine Werbung, keine Tracker und keine
        Analyse-Cookies. Wir erhalten Daten nur, wenn du uns ausdrücklich eine Anfrage schickst.
      </p>

      <h2>Verantwortlich</h2>
      <p>
        {company.companyName}, {company.address.join(', ')}. Kontakt für Datenschutzfragen:{' '}
        <span className="selectable">{company.privacyContact}</span>
      </p>

      <h2>Deine Sammlung im Browser</h2>
      <p>
        Alles, was du in „Meine Sammlung“ und im Rettungshelfer eingibst, speichert die App im lokalen Speicher deines
        Browsers (localStorage). Diese Daten werden nicht an uns übertragen. Du kannst sie jederzeit in der App oder über die
        Einstellungen deines Browsers löschen.
      </p>

      <h2>Wenn du eine Anfrage sendest</h2>
      <p>
        Für eine Digitalisierungsanfrage übermittelst du uns deinen Namen, deine E-Mail-Adresse, optional deine Telefonnummer,
        bei Abholung oder Versand deine Adresse sowie die ausgewählten Kassetten mit Titel, Format, Jahr, Zustand, Inhalt und
        Notizen.
        {company.order.endpoint
          ? ' Die Anfrage wird über einen Formular-Dienst an uns weitergeleitet, der als Auftragsverarbeiter für uns tätig ist.'
          : ' Die Anfrage wird mit deinem eigenen E-Mail-Programm an uns geschickt.'}
      </p>
      <p>
        Wir verwenden diese Daten, um deine Anfrage zu beantworten, ein Angebot zu erstellen und einen daraus entstehenden
        Auftrag abzuwickeln (Art. 6 Abs. 1 lit. b DSGVO). Wir geben sie nicht für Werbezwecke weiter. Wir löschen sie, sobald
        sie dafür nicht mehr nötig sind und keine gesetzlichen Aufbewahrungspflichten bestehen.
      </p>

      <h2>Hosting</h2>
      <p>
        Die App wird über GitHub Pages (GitHub, Inc.) ausgeliefert. Beim Aufruf verarbeitet GitHub technisch notwendige Daten
        wie deine IP-Adresse, um die Seite bereitzustellen und abzusichern.
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
        Widerspruch. Wende dich dafür an <span className="selectable">{company.privacyContact}</span>. Du kannst dich außerdem bei
        der Österreichischen Datenschutzbehörde beschweren (dsb.gv.at).
      </p>
    </div>
  );
}
