import { company } from '../config';
import type { FormatId } from './types';

export type YesNoUnsure = 'ja' | 'nein' | 'unsicher';

export interface HelperAnswers {
  format: FormatId | '';
  issues: {
    schimmel: boolean;
    band: boolean;
    gehaeuse: boolean;
    feucht: boolean;
  };
  player: YesNoUnsure | '';
  capture: YesNoUnsure | '';
  computer: 'ja' | 'nein' | '';
  diy: 'ja' | 'nein' | 'unsicher' | '';
}

export const EMPTY_ANSWERS: HelperAnswers = {
  format: '',
  issues: { schimmel: false, band: false, gehaeuse: false, feucht: false },
  player: '',
  capture: '',
  computer: '',
  diy: '',
};

export const ISSUE_LABELS: Record<keyof HelperAnswers['issues'], { label: string; hint: string }> = {
  schimmel: {
    label: 'Schimmel oder Belag',
    hint: 'Weiße, graue oder pelzige Flecken auf dem Band oder im Gehäuse.',
  },
  band: {
    label: 'Band beschädigt',
    hint: 'Das Band ist geknickt, gerissen, verknittert oder hängt heraus.',
  },
  gehaeuse: {
    label: 'Gehäuse beschädigt',
    hint: 'Das Gehäuse ist gebrochen oder die Spulen klemmen.',
  },
  feucht: {
    label: 'Feucht gelagert',
    hint: 'Die Kassette lag lange in Keller oder Dachboden, oder sie riecht muffig.',
  },
};

export interface DeviceInfo {
  player: string;
  playerQuestion: string;
  capture: string;
  captureQuestion: string;
  fileTip: string;
}

export const DEVICE_INFO: Record<FormatId, DeviceInfo> = {
  audio: {
    player: 'ein funktionierendes Kassettendeck (Tapedeck) oder ein Kassettenspieler mit Kopfhörer- oder Line-Ausgang',
    playerQuestion: 'Hast du ein funktionierendes Kassettendeck oder einen Kassettenspieler?',
    capture: 'ein Audio-Interface oder ein Computer mit Line-Eingang sowie ein passendes Kabel',
    captureQuestion: 'Hast du ein Audio-Interface oder einen Computer mit Line-Eingang?',
    fileTip: 'Für das Archiv eignet sich eine unkomprimierte WAV-Datei, zum Teilen zusätzlich eine MP3-Datei.',
  },
  vhs: {
    player: 'ein funktionierender VHS-Videorekorder',
    playerQuestion: 'Hast du einen funktionierenden VHS-Videorekorder?',
    capture: 'ein Video-Grabber (USB-Aufnahmegerät für Videosignale) mit passendem Kabel, z. B. Scart oder Cinch',
    captureQuestion: 'Hast du einen Video-Grabber (USB-Aufnahmegerät für Video)?',
    fileTip: 'Speichere in guter Qualität, z. B. als MP4-Datei. Zum Archivieren ruhig eine hohe Bitrate wählen.',
  },
  'vhs-c': {
    player: 'ein VHS-Videorekorder mit VHS-C-Adapterkassette oder ein VHS-C-Camcorder',
    playerQuestion: 'Hast du einen VHS-Rekorder mit VHS-C-Adapter oder einen VHS-C-Camcorder?',
    capture: 'ein Video-Grabber (USB-Aufnahmegerät für Videosignale) mit passendem Kabel',
    captureQuestion: 'Hast du einen Video-Grabber (USB-Aufnahmegerät für Video)?',
    fileTip: 'Speichere in guter Qualität, z. B. als MP4-Datei.',
  },
  video8: {
    player: 'ein Video8- oder Hi8-Camcorder bzw. -Abspielgerät (Hi8-Geräte spielen auch Video8)',
    playerQuestion: 'Hast du einen funktionierenden Video8- oder Hi8-Camcorder?',
    capture: 'ein Video-Grabber (USB-Aufnahmegerät für Videosignale) mit passendem Kabel',
    captureQuestion: 'Hast du einen Video-Grabber (USB-Aufnahmegerät für Video)?',
    fileTip: 'Speichere in guter Qualität, z. B. als MP4-Datei.',
  },
  hi8: {
    player: 'ein Hi8-Camcorder bzw. -Abspielgerät (reine Video8-Geräte spielen Hi8 meist nicht)',
    playerQuestion: 'Hast du einen funktionierenden Hi8-Camcorder?',
    capture: 'ein Video-Grabber (USB-Aufnahmegerät für Videosignale) mit passendem Kabel',
    captureQuestion: 'Hast du einen Video-Grabber (USB-Aufnahmegerät für Video)?',
    fileTip: 'Speichere in guter Qualität, z. B. als MP4-Datei.',
  },
  minidv: {
    player: 'ein MiniDV-Camcorder oder -Rekorder mit FireWire-Anschluss (auch „i.LINK“ oder „IEEE 1394“ genannt)',
    playerQuestion: 'Hast du einen funktionierenden MiniDV-Camcorder mit FireWire-Anschluss?',
    capture: 'ein Computer mit FireWire-Anschluss oder passendem Adapter – die Übertragung erfolgt digital',
    captureQuestion: 'Hat dein Computer einen FireWire-Anschluss oder einen passenden Adapter?',
    fileTip: 'Die Aufnahme ist bereits digital. Übertrage sie möglichst unverändert (DV-Datei) und erstelle bei Bedarf zusätzlich eine MP4-Datei.',
  },
  unbekannt: {
    player: 'ein Abspielgerät, das zum Format passt – dafür muss das Format zuerst bestimmt werden',
    playerQuestion: 'Hast du ein Abspielgerät, das zu dieser Kassette passt?',
    capture: 'ein Aufnahmegerät für den Computer, je nach Format ein Audio-Interface oder ein Video-Grabber',
    captureQuestion: 'Hast du ein Aufnahmegerät für den Computer (Audio-Interface oder Video-Grabber)?',
    fileTip: 'Welche Datei sinnvoll ist, hängt vom Format ab.',
  },
};

export type Risk = 'stopp' | 'vorsicht' | 'ok';
export type Route = 'fachbetrieb' | 'selbst' | 'dienstleister' | 'offen';

export interface PlanStep {
  id: string;
  text: string;
}

export interface Plan {
  risk: Risk;
  route: Route;
  headline: string;
  summary: string;
  reasons: string[];
  steps: PlanStep[];
}

const BACKUP_STEPS: PlanStep[] = [
  { id: 'sicherung-pruefen', text: 'Fertige Datei vollständig ansehen oder anhören.' },
  { id: 'sicherung-benennen', text: 'Datei verständlich benennen, z. B. mit Jahr und Inhalt.' },
  { id: 'sicherung-dokumentieren', text: 'Aufnahmejahr und Beschreibung in der Sammlung festhalten.' },
  { id: 'sicherung-kopie', text: 'Zusätzliche Sicherungskopie auf einem zweiten Datenträger anlegen.' },
];

export function isAnswered(answers: HelperAnswers, step: number): boolean {
  if (step === 0) return answers.format !== '';
  if (step === 1) return true;
  if (step === 2) {
    return answers.player !== '' && answers.capture !== '' && answers.computer !== '' && answers.diy !== '';
  }
  return true;
}

export function buildPlan(a: HelperAnswers): Plan {
  const format: FormatId = a.format || 'unbekannt';
  const device = DEVICE_INFO[format];
  const reasons: string[] = [];
  const steps: PlanStep[] = [];

  if (format === 'unbekannt') {
    steps.push({
      id: 'format-bestimmen',
      text: 'Format bestimmen: Größe messen und nach Aufdrucken wie „VHS“, „Hi8“ oder „DV“ suchen.',
    });
  }

  // 1. Gefährdete Kassetten: nicht abspielen.
  if (a.issues.schimmel || a.issues.band) {
    if (a.issues.schimmel) reasons.push('Schimmel kann sich beim Abspielen im Gerät verteilen und das Band weiter zerstören.');
    if (a.issues.band) reasons.push('Ein beschädigtes Band kann im Gerät weiter reißen oder sich verwickeln.');
    steps.push(
      { id: 'nicht-abspielen', text: 'Kassette nicht abspielen und nicht spulen.' },
      { id: 'getrennt-lagern', text: 'Getrennt von anderen Kassetten trocken und kühl lagern, z. B. in einem verschlossenen Beutel.' },
      {
        id: 'fachbetrieb-suchen',
        text: a.issues.schimmel
          ? 'Fachbetrieb suchen, der Bandreinigung bei Schimmel anbietet, und den Zustand dort begutachten lassen.'
          : 'Fachbetrieb suchen, der Bänder reparieren kann, und den Zustand dort begutachten lassen.',
      },
      { id: 'angebot-einholen', text: 'Angebot einholen und klären, ob die Originalkassette zurückkommt.' },
      ...BACKUP_STEPS,
    );
    return {
      risk: 'stopp',
      route: 'fachbetrieb',
      headline: 'Bitte nicht abspielen – fachlich begutachten lassen',
      summary:
        'Diese Kassette ist gefährdet. Jeder Abspielversuch kann die Aufnahme unwiederbringlich beschädigen. Eine Fachwerkstatt kann das Band oft reinigen oder reparieren und danach sicher digitalisieren.',
      reasons,
      steps,
    };
  }

  if (a.issues.gehaeuse) {
    reasons.push('Ein gebrochenes Gehäuse oder klemmende Spulen können das Band im Gerät beschädigen.');
    steps.push(
      { id: 'nicht-abspielen', text: 'Kassette vorerst nicht abspielen.' },
      { id: 'fachbetrieb-gehaeuse', text: 'Dienstleister fragen, ob das Band in ein neues Gehäuse umgesetzt werden kann.' },
      { id: 'angebot-einholen', text: 'Angebot einholen und klären, ob die Originalkassette zurückkommt.' },
      ...BACKUP_STEPS,
    );
    return {
      risk: 'vorsicht',
      route: 'fachbetrieb',
      headline: 'Erst reparieren lassen, dann digitalisieren',
      summary: 'Mit beschädigtem Gehäuse ist Abspielen riskant. Ein Fachbetrieb kann das Band meist in ein neues Gehäuse setzen.',
      reasons,
      steps,
    };
  }

  let risk: Risk = 'ok';
  if (a.issues.feucht) {
    risk = 'vorsicht';
    reasons.push('Feucht gelagerte Kassetten können Schimmel haben, der nicht sofort auffällt.');
    steps.push(
      { id: 'akklimatisieren', text: 'Kassette einige Tage bei Zimmertemperatur trocken liegen lassen.' },
      {
        id: 'genau-ansehen',
        text: 'Mit einer Taschenlampe durch das Sichtfenster auf Flecken oder Belag prüfen. Im Zweifel nicht abspielen und Fachbetrieb fragen.',
      },
    );
  }

  const hasAll = a.player === 'ja' && a.capture === 'ja' && a.computer === 'ja';
  let route: Route;

  if (a.diy === 'nein') {
    route = 'dienstleister';
    reasons.push('Du möchtest die Digitalisierung lieber abgeben.');
  } else if (hasAll && format !== 'unbekannt') {
    route = 'selbst';
    reasons.push('Du hast die nötigen Geräte und kannst selbst digitalisieren.');
  } else {
    route = 'offen';
    if (a.player !== 'ja') reasons.push(`Es fehlt noch ${device.player}.`);
    if (a.capture !== 'ja') reasons.push(`Es fehlt noch ${device.capture}.`);
    if (a.computer !== 'ja') reasons.push('Es fehlt noch ein Computer für die Aufnahme.');
  }

  if (route === 'selbst') {
    steps.push(
      { id: 'geraet-testen', text: 'Abspielgerät zuerst mit einer unwichtigen Kassette testen.' },
      { id: 'anschliessen', text: `Geräte verbinden: ${device.capture}.` },
      { id: 'probeaufnahme', text: 'Kurze Probeaufnahme machen und Bild bzw. Ton kontrollieren.' },
      { id: 'aufnehmen', text: 'Kassette vollständig in Echtzeit überspielen – das dauert so lange wie die Aufnahme selbst.' },
      { id: 'speichern', text: device.fileTip },
    );
  } else if (route === 'dienstleister') {
    steps.push(
      { id: 'anfrage', text: `Unverbindliche Anfrage an ${company.brandName} senden – die Kassetten wählst du direkt aus deiner Sammlung.` },
      { id: 'angebot', text: 'Angebot prüfen und bestätigen.' },
      { id: 'nummerieren', text: 'Kassetten mit den Nummern vom Begleitzettel beschriften.' },
      { id: 'uebergabe', text: 'Kassetten übergeben: abholen lassen, schicken oder vorbeibringen.' },
      { id: 'pruefen', text: 'Gelieferte Dateien nach Erhalt sofort prüfen.' },
    );
  } else {
    steps.push(
      {
        id: 'entscheiden',
        text: `Entscheiden: fehlende Geräte leihen oder gebraucht kaufen – oder die Digitalisierung an ${company.brandName} abgeben.`,
      },
      { id: 'umfrage', text: 'In Familie und Freundeskreis nach passenden Geräten fragen.' },
    );
  }

  steps.push(...BACKUP_STEPS);

  const headlines: Record<Exclude<Route, 'fachbetrieb'>, string> = {
    selbst: 'Du kannst selbst digitalisieren',
    dienstleister: `${company.brandName} übernimmt das für dich`,
    offen: 'Zwei Wege stehen dir offen',
  };
  const summaries: Record<Exclude<Route, 'fachbetrieb'>, string> = {
    selbst: `Du brauchst ${device.player} und ${device.capture}. Nimm dir Zeit – die Überspielung läuft in Echtzeit.`,
    dienstleister: 'Wir überspielen deine Kassetten und liefern dir die Dateien. Du kümmerst dich danach nur noch um die Sicherung.',
    offen: `Dir fehlen noch Geräte. Du kannst sie besorgen und selbst digitalisieren – oder die Arbeit an ${company.brandName} abgeben.`,
  };

  return { risk, route, headline: headlines[route], summary: summaries[route], reasons, steps };
}
