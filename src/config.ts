/**
 * Firmendaten und Angebot von „Kassetten retten“ (Simple7Media).
 *
 * ►  Alle Werte in eckigen Klammern [ … ] sind Platzhalter und müssen vor der
 *    Veröffentlichung ersetzt werden. Solange Platzhalter übrig sind, zeigt die
 *    Auftragsseite einen gelben Hinweis.
 */

export type HandoverId = 'abholung' | 'versand' | 'abgabe';

export interface CompanyConfig {
  brandName: string;
  companyName: string;
  /**
   * Eigene Domain ohne https://, z. B. „kassetten-retten.at“. Leer = Veröffentlichung unter
   * https://<nutzername>.github.io/<repository>/. Mit Domain wird automatisch eine CNAME-Datei erzeugt.
   */
  domain: string;
  /** Region für Startseite und Suchmaschinen, z. B. „Wien und Niederösterreich“. */
  region: string;
  /** Kurz über dich bzw. das Unternehmen – erscheint unter „Über uns“. */
  about: { name: string; role: string; text: string };
  /** Optional: übliche Bearbeitungsdauer, z. B. „etwa 2 Wochen“. Leer = keine Angabe. */
  turnaround: string;
  /** E-Mail-Adresse, an die Aufträge gehen (auch für den E-Mail-Weg). */
  email: string;
  phone: string;
  /** Postanschrift: für Versand und persönliche Abgabe. */
  address: string[];
  /** Öffnungszeiten für die persönliche Abgabe. */
  openingHours: string;
  /** Gebiet, in dem abgeholt wird. Leer lassen = Abholung nicht anbieten. */
  pickupArea: string;
  /** Welche Übergabewege angeboten werden. */
  handover: HandoverId[];
  /** Wie die fertigen Dateien geliefert werden können. */
  deliveryOptions: string[];
  /** Formate, die digitalisiert werden. */
  services: string[];
  /** Optionale Preisangaben. Leer = „Du erhältst vorab ein unverbindliches Angebot.“ */
  pricing: { label: string; price: string }[];
  /** Text zu beschädigten oder schimmeligen Kassetten. */
  damagedNote: string;

  order: {
    /**
     * Optional: Adresse eines Formular-Dienstes (z. B. Formspree, Web3Forms) oder
     * eines eigenen Servers, der JSON per POST annimmt. Leer = Versand per E-Mail-Programm.
     */
    endpoint: string;
    /** Zusätzliche Felder für den Formular-Dienst, z. B. { access_key: '…' } bei Web3Forms. */
    extraFields: Record<string, string>;
  };

  /** Optionaler Unterstützen-Link (z. B. PayPal.me, Ko-fi). Leer = kein Button. */
  support: { url: string; label: string; text: string };

  /** Impressum (Angaben nach § 5 ECG und § 25 MedienG – bitte prüfen lassen). */
  imprint: {
    owner: string;
    businessPurpose: string;
    vatId: string;
    companyRegister: string;
    authority: string;
    chamber: string;
  };
  /** Datenschutz: wer verantwortlich ist, wohin Anfragen gehen. */
  privacyContact: string;
}

export const company: CompanyConfig = {
  brandName: 'Kassetten retten',
  companyName: 'Simple7Media',
  domain: '',
  region: '[z. B. Wien und Umgebung]',
  about: {
    name: '[Dein Name]',
    role: 'Gründer von Kassetten retten · Simple7Media',
    text: '[Ein paar persönliche Sätze: Warum machst du das? Seit wann? Was ist dir bei fremden Erinnerungen wichtig?]',
  },
  turnaround: '',
  email: '[auftrag@deine-domain.at]',
  phone: '[+43 …]',
  address: ['Simple7Media', '[Straße und Hausnummer]', '[PLZ Ort]', 'Österreich'],
  openingHours: '[nach Terminvereinbarung]',
  pickupArea: '[z. B. Wien und Umgebung]',
  handover: ['abholung', 'versand', 'abgabe'],
  deliveryOptions: ['Download-Link', 'USB-Stick'],
  services: ['Audiokassette', 'VHS', 'VHS-C', 'Video8', 'Hi8', 'MiniDV'],
  pricing: [],
  damagedNote:
    'Schick beschädigte oder schimmelige Kassetten bitte mit, ohne sie vorher abzuspielen. Wir sehen sie uns an und sagen dir vorab, was möglich ist.',
  order: {
    endpoint: '',
    extraFields: {},
  },
  support: {
    url: '',
    label: 'Projekt unterstützen',
    text: 'Diese App ist kostenlos und ohne Werbung. Wenn sie dir geholfen hat, kannst du ihre Weiterentwicklung freiwillig unterstützen.',
  },
  imprint: {
    owner: '[Vor- und Nachname bzw. Firmenwortlaut]',
    businessPurpose: '[z. B. Digitalisierung von Audio- und Videomedien]',
    vatId: '[UID-Nummer, falls vorhanden]',
    companyRegister: '[Firmenbuchnummer und -gericht, falls eingetragen]',
    authority: '[zuständige Gewerbebehörde]',
    chamber: '[Mitglied der WKÖ, Fachgruppe …]',
  },
  privacyContact: '[datenschutz@deine-domain.at]',
};

const isPlaceholder = (v: string) => /\[[^\]]*\]/.test(v);

/** Liste der noch nicht ausgefüllten Angaben. */
export function configIssues(c: CompanyConfig = company): string[] {
  const issues: string[] = [];
  if (isPlaceholder(c.email)) issues.push('E-Mail-Adresse für Aufträge');
  if (isPlaceholder(c.phone)) issues.push('Telefonnummer');
  if (c.address.some(isPlaceholder)) issues.push('Anschrift');
  if (c.handover.includes('abholung') && isPlaceholder(c.pickupArea)) issues.push('Abholgebiet');
  if (c.handover.includes('abgabe') && isPlaceholder(c.openingHours)) issues.push('Zeiten für die persönliche Abgabe');
  if (Object.values(c.imprint).some(isPlaceholder)) issues.push('Impressum');
  if (isPlaceholder(c.region)) issues.push('Region');
  if (isPlaceholder(c.about.name) || isPlaceholder(c.about.text)) issues.push('„Über uns“');
  if (isPlaceholder(c.privacyContact)) issues.push('Datenschutz-Kontakt');
  return issues;
}

export function availableHandover(c: CompanyConfig = company): HandoverId[] {
  return c.handover.filter((h) => h !== 'abholung' || c.pickupArea.trim() !== '');
}
