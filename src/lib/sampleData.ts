import { createCassette } from './collection';
import type { Cassette, CassetteInput, Checklist } from './types';

/** Erfundene Beispielkassetten – werden nur über die ausdrücklich gekennzeichnete Aktion geladen. */
const SAMPLES: (CassetteInput & { checklist?: Partial<Checklist> })[] = [
  {
    title: 'Beispiel: Sommerurlaub am See',
    format: 'vhs',
    year: '1994',
    content: 'Bootsfahrt, Picknick und das erste Mal Schwimmen ohne Schwimmflügel.',
    condition: 'gut',
    location: 'Wohnzimmerschrank, untere Schublade',
    notes: 'Erfundener Beispieleintrag zum Ausprobieren.',
    status: 'erfasst',
  },
  {
    title: 'Beispiel: Kinderlieder zum Mitsingen',
    format: 'audio',
    year: 'um 1988',
    content: 'Selbst aufgenommene Kinderstimmen und Geburtstagslieder.',
    condition: 'gebraucht',
    location: 'Karton „Musik“ im Keller',
    notes: 'Erfundener Beispieleintrag zum Ausprobieren.',
    status: 'geplant',
  },
  {
    title: 'Beispiel: Taufe im Familienkreis',
    format: 'hi8',
    year: '1999',
    content: 'Feier im Garten mit der ganzen Familie.',
    condition: 'gut',
    location: 'Camcordertasche',
    notes: 'Erfundener Beispieleintrag zum Ausprobieren.',
    status: 'digitalisiert',
    checklist: { geprueft: true, benannt: true },
  },
  {
    title: 'Beispiel: Kassette vom Dachboden',
    format: 'unbekannt',
    year: '',
    content: 'Unbeschriftet – Inhalt noch unklar.',
    condition: 'schimmel',
    location: 'Dachboden, Kiste 3',
    notes: 'Erfundener Beispieleintrag: Weißer Belag sichtbar, daher nicht abspielen.',
    status: 'erfasst',
  },
];

export function createSampleCassettes(now = new Date()): Cassette[] {
  return SAMPLES.map(({ checklist, ...input }, i) => {
    const c = createCassette(input, new Date(now.getTime() - i * 1000));
    return { ...c, sample: true, checklist: { ...c.checklist, ...checklist } };
  });
}
