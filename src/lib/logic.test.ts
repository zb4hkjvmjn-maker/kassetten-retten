import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCassette, DEFAULT_FILTER, emptyInput, filterCassettes, suggestFileName } from './collection';
import { buildPlan, EMPTY_ANSWERS } from './helper';
import { computeStats, nextAction } from './progress';
import type { CassetteInput } from './types';

const make = (patch: Partial<CassetteInput>) => createCassette({ ...emptyInput(), title: 'Test', ...patch });

describe('Suche und Filter', () => {
  const list = [
    make({ title: 'Hochzeit Müller', format: 'vhs', status: 'erfasst', location: 'Keller' }),
    make({ title: 'Kinderlieder', format: 'audio', status: 'gesichert', content: 'Geburtstag' }),
    make({ title: 'Urlaub Gardasee', format: 'hi8', status: 'digitalisiert', year: '1999' }),
  ];

  it('findet Begriffe ohne Rücksicht auf Groß- und Kleinschreibung', () => {
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, query: 'hochZEIT' }).length, 1);
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, query: 'geburtstag' }).length, 1);
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, query: '1999' }).length, 1);
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, query: 'keller müller' }).length, 1);
  });

  it('filtert nach Format und Status', () => {
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, format: 'audio' }).length, 1);
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, status: 'digitalisiert' }).length, 1);
    assert.equal(filterCassettes(list, { ...DEFAULT_FILTER, format: 'audio', status: 'erfasst' }).length, 0);
  });
});

describe('Fortschritt', () => {
  it('zählt Gesicherte auch als digitalisiert', () => {
    const stats = computeStats([make({ status: 'gesichert' }), make({ status: 'digitalisiert' }), make({})]);
    assert.equal(stats.total, 3);
    assert.equal(stats.digitized, 2);
    assert.equal(stats.secured, 1);
    assert.equal(stats.securedPercent, 33);
  });

  it('schlägt passende nächste Schritte vor', () => {
    assert.equal(nextAction([]).label, 'Erste Kassette erfassen');
    const done = make({ status: 'digitalisiert' });
    done.checklist = { geprueft: true, benannt: true, dokumentiert: true, kopie: true };
    assert.equal(nextAction([done]).label, 'Sicherung bestätigen');
    assert.equal(nextAction([make({ condition: 'schimmel' })]).label, 'Rettungshelfer öffnen');
    assert.equal(nextAction([make({ status: 'gesichert' })]).label, 'Weitere Kassette erfassen');
  });
});

describe('Dateiname', () => {
  it('erzeugt verständliche Namen ohne Sonderzeichen', () => {
    assert.equal(
      suggestFileName({ title: 'Urlaub am Gardasee – Teil 1!', year: 'um 1994', format: 'vhs' }),
      '1994_urlaub-am-gardasee-teil-1_vhs.mp4',
    );
    assert.equal(suggestFileName({ title: 'Oma Grüße', year: '', format: 'audio' }), 'jahr-unbekannt_oma-gruesse_audiokassette.wav');
  });
});

describe('Rettungshelfer', () => {
  const base = { ...EMPTY_ANSWERS, format: 'vhs' as const, player: 'ja' as const, capture: 'ja' as const, computer: 'ja' as const, diy: 'ja' as const };

  it('rät bei Schimmel vom Abspielen ab', () => {
    const plan = buildPlan({ ...base, issues: { ...base.issues, schimmel: true } });
    assert.equal(plan.risk, 'stopp');
    assert.equal(plan.route, 'fachbetrieb');
    assert.ok(plan.steps.some((s) => s.id === 'nicht-abspielen'));
  });

  it('empfiehlt selbst digitalisieren, wenn alles vorhanden ist', () => {
    assert.equal(buildPlan(base).route, 'selbst');
  });

  it('empfiehlt einen Dienstleister, wenn gewünscht', () => {
    assert.equal(buildPlan({ ...base, diy: 'nein' }).route, 'dienstleister');
  });

  it('zeigt beide Wege, wenn Geräte fehlen', () => {
    const plan = buildPlan({ ...base, capture: 'nein' });
    assert.equal(plan.route, 'offen');
    assert.ok(plan.steps.some((s) => s.id === 'sicherung-kopie'));
  });
});
