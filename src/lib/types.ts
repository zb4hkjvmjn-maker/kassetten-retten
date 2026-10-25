/** Datenmodell der App „Kassetten retten“. */

export const FORMAT_IDS = ['audio', 'vhs', 'vhs-c', 'video8', 'hi8', 'minidv', 'unbekannt'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export const STATUS_IDS = ['erfasst', 'geplant', 'in-bearbeitung', 'digitalisiert', 'gesichert'] as const;
export type StatusId = (typeof STATUS_IDS)[number];

export const CONDITION_IDS = ['unbekannt', 'gut', 'gebraucht', 'schimmel', 'beschaedigt'] as const;
export type ConditionId = (typeof CONDITION_IDS)[number];

export const CHECKLIST_IDS = ['geprueft', 'benannt', 'dokumentiert', 'kopie'] as const;
export type ChecklistId = (typeof CHECKLIST_IDS)[number];
export type Checklist = Record<ChecklistId, boolean>;

export interface Cassette {
  id: string;
  title: string;
  format: FormatId;
  /** Freitext, damit auch „um 1990“ oder „1990er“ möglich ist. */
  year: string;
  content: string;
  condition: ConditionId;
  location: string;
  notes: string;
  status: StatusId;
  checklist: Checklist;
  /** Kennzeichnet ausdrücklich geladene Beispieldaten. */
  sample?: boolean;
  /** Auftragsnummer, falls die Kassette bei Kassetten retten angefragt wurde. */
  orderRef?: string;
  createdAt: string;
  updatedAt: string;
}

/** Felder, die im Formular bearbeitet werden. */
export type CassetteInput = Pick<
  Cassette,
  'title' | 'format' | 'year' | 'content' | 'condition' | 'location' | 'notes' | 'status'
>;

export const EMPTY_CHECKLIST: Checklist = {
  geprueft: false,
  benannt: false,
  dokumentiert: false,
  kopie: false,
};

export const FIELD_LIMITS = {
  title: 120,
  year: 30,
  content: 2000,
  location: 200,
  notes: 4000,
} as const;
