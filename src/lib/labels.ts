import type { ChecklistId, ConditionId, FormatId, StatusId } from './types';

export const FORMAT_LABELS: Record<FormatId, string> = {
  audio: 'Audiokassette',
  vhs: 'VHS',
  'vhs-c': 'VHS-C',
  video8: 'Video8',
  hi8: 'Hi8',
  minidv: 'MiniDV',
  unbekannt: 'Unbekannt',
};

/** Kurze Erkennungshilfe je Format (Maße gerundet). */
export const FORMAT_HINTS: Record<FormatId, string> = {
  audio: 'Die klassische Musik- und Sprachkassette, etwa 10 × 6,5 cm groß.',
  vhs: 'Große Videokassette, etwa 19 × 10 cm – passt in einen normalen Videorekorder.',
  'vhs-c': 'Kleine Videokassette aus Camcordern, etwa 10 × 6 cm. Läuft mit Adapter im VHS-Rekorder.',
  video8: 'Kleine Camcorder-Kassette, etwa 9,5 × 6 cm, meist mit „Video8“ oder „8mm“ beschriftet.',
  hi8: 'Sieht aus wie Video8, trägt aber den Aufdruck „Hi8“.',
  minidv: 'Sehr kleine Camcorder-Kassette, etwa 6,5 × 5 cm, oft mit „DV“-Logo.',
  unbekannt: 'Du bist dir nicht sicher? Kein Problem – der Rettungshelfer hilft beim Bestimmen.',
};

export const STATUS_LABELS: Record<StatusId, string> = {
  erfasst: 'Erfasst',
  geplant: 'Digitalisierung geplant',
  'in-bearbeitung': 'In Bearbeitung',
  digitalisiert: 'Digitalisiert',
  gesichert: 'Gesichert',
};

export const STATUS_HINTS: Record<StatusId, string> = {
  erfasst: 'Die Kassette ist in deiner Sammlung eingetragen.',
  geplant: 'Du weißt, wie und von wem sie digitalisiert wird.',
  'in-bearbeitung': 'Die Kassette wird gerade überspielt oder ist beim Dienstleister.',
  digitalisiert: 'Es gibt eine digitale Datei – die Sicherung fehlt noch.',
  gesichert: 'Die Datei ist geprüft, beschriftet und doppelt gesichert.',
};

export const CONDITION_LABELS: Record<ConditionId, string> = {
  unbekannt: 'Noch nicht geprüft',
  gut: 'Gut erhalten',
  gebraucht: 'Gebrauchsspuren',
  schimmel: 'Schimmel sichtbar',
  beschaedigt: 'Band beschädigt oder gerissen',
};

export const RISKY_CONDITIONS: ConditionId[] = ['schimmel', 'beschaedigt'];

export const CHECKLIST_ITEMS: { id: ChecklistId; label: string; hint: string }[] = [
  {
    id: 'geprueft',
    label: 'Aufnahme vollständig prüfen',
    hint: 'Die Datei einmal ganz ansehen oder anhören: Sind Bild und Ton in Ordnung, fehlt nichts am Ende?',
  },
  {
    id: 'benannt',
    label: 'Datei verständlich benennen',
    hint: 'Ein Name mit Jahr und Inhalt hilft dir und deiner Familie, die Aufnahme später wiederzufinden.',
  },
  {
    id: 'dokumentiert',
    label: 'Aufnahmejahr und Beschreibung dokumentieren',
    hint: 'Notiere, wann die Aufnahme entstanden ist und was zu sehen oder zu hören ist.',
  },
  {
    id: 'kopie',
    label: 'Zusätzliche Sicherungskopie erstellen',
    hint: 'Speichere eine zweite Kopie auf einem anderen Datenträger, z. B. einer externen Festplatte – am besten an einem anderen Ort.',
  },
];
