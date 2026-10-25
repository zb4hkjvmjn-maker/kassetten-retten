import { checklistComplete } from './collection';
import { RISKY_CONDITIONS } from './labels';
import { STATUS_IDS, type Cassette, type StatusId } from './types';

export interface Stats {
  total: number;
  /** Digitalisiert oder bereits gesichert. */
  digitized: number;
  secured: number;
  byStatus: Record<StatusId, number>;
  /** Anteil gesicherter Kassetten in Prozent (gerundet). */
  securedPercent: number;
  digitizedPercent: number;
}

export function computeStats(cassettes: Cassette[]): Stats {
  const byStatus = Object.fromEntries(STATUS_IDS.map((s) => [s, 0])) as Record<StatusId, number>;
  for (const c of cassettes) byStatus[c.status] += 1;
  const total = cassettes.length;
  const secured = byStatus.gesichert;
  const digitized = byStatus.digitalisiert + secured;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return {
    total,
    digitized,
    secured,
    byStatus,
    securedPercent: pct(secured),
    digitizedPercent: pct(digitized),
  };
}

export interface NextAction {
  title: string;
  text: string;
  label: string;
  /** Ziel als Hash-Pfad, z. B. „/sammlung/neu“. */
  href: string;
}

/** Ermittelt die sinnvollste nächste Aktion für die Sammlung. */
export function nextAction(cassettes: Cassette[]): NextAction {
  if (cassettes.length === 0) {
    return {
      title: 'Leg los mit deiner ersten Kassette',
      text: 'Trag eine Kassette ein – Titel und Format genügen für den Anfang.',
      label: 'Erste Kassette erfassen',
      href: '/sammlung/neu',
    };
  }

  const risky = cassettes.find((c) => RISKY_CONDITIONS.includes(c.condition) && c.status === 'erfasst');
  if (risky) {
    return {
      title: 'Eine Kassette braucht besondere Vorsicht',
      text: `„${risky.title}“ ist als beschädigt oder schimmelig vermerkt. Bitte nicht abspielen – der Rettungshelfer erklärt, was jetzt sinnvoll ist.`,
      label: 'Rettungshelfer öffnen',
      href: `/rettungshelfer?kassette=${encodeURIComponent(risky.id)}`,
    };
  }

  const readyToConfirm = cassettes.find((c) => c.status !== 'gesichert' && checklistComplete(c.checklist));
  if (readyToConfirm) {
    return {
      title: 'Sicherung abschließen',
      text: `Für „${readyToConfirm.title}“ sind alle Sicherungsschritte abgehakt.`,
      label: 'Sicherung bestätigen',
      href: `/sammlung/${encodeURIComponent(readyToConfirm.id)}`,
    };
  }

  const digitized = cassettes.find((c) => c.status === 'digitalisiert');
  if (digitized) {
    return {
      title: 'Digitalisierte Aufnahme sichern',
      text: `„${digitized.title}“ ist digitalisiert. Mit der Sicherungscheckliste bleibt die Datei dauerhaft erhalten.`,
      label: 'Sicherungscheckliste öffnen',
      href: `/sammlung/${encodeURIComponent(digitized.id)}`,
    };
  }

  const captured = cassettes.find((c) => c.status === 'erfasst');
  if (captured) {
    return {
      title: 'Digitalisierung planen',
      text: `Der Rettungshelfer zeigt dir in wenigen Fragen, wie „${captured.title}“ digitalisiert werden kann.`,
      label: 'Digitalisierung planen',
      href: `/rettungshelfer?kassette=${encodeURIComponent(captured.id)}`,
    };
  }

  const active = cassettes.find((c) => c.status === 'geplant' || c.status === 'in-bearbeitung');
  if (active) {
    return {
      title: 'Fortschritt aktualisieren',
      text: `Ist „${active.title}“ schon digitalisiert? Dann trag den neuen Stand ein.`,
      label: 'Kassette öffnen',
      href: `/sammlung/${encodeURIComponent(active.id)}`,
    };
  }

  return {
    title: 'Alle Kassetten sind gesichert',
    text: 'Großartig! Erfasse weitere Kassetten oder lade eine aktuelle Sicherung deiner Sammlung herunter.',
    label: 'Weitere Kassette erfassen',
    href: '/sammlung/neu',
  };
}
