import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCassette, emptyInput } from './collection';
import { buildExport, mergeCassettes, parseImport, validateInput } from './validation';

const sample = () => createCassette({ ...emptyInput(), title: 'Hochzeit', format: 'vhs', year: '1994' });

describe('validateInput', () => {
  it('verlangt einen Titel', () => {
    assert.ok(validateInput(emptyInput()).title);
    assert.deepEqual(validateInput({ ...emptyInput(), title: 'Urlaub' }), {});
  });

  it('begrenzt die Länge des Aufnahmejahrs', () => {
    assert.ok(validateInput({ ...emptyInput(), title: 'x', year: 'x'.repeat(40) }).year);
  });
});

describe('Export und Import', () => {
  it('liest den eigenen Export verlustfrei wieder ein', () => {
    const a = sample();
    a.checklist.geprueft = true;
    const result = parseImport(buildExport([a]));
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.cassettes, [a]);
  });

  it('lehnt ungültiges JSON ab', () => {
    const result = parseImport('{ kein json');
    assert.equal(result.ok, false);
  });

  it('lehnt fremde Dateien ab', () => {
    assert.equal(parseImport(JSON.stringify({ app: 'andere-app', cassettes: [] })).ok, false);
    assert.equal(parseImport(JSON.stringify({ hallo: 'welt' })).ok, false);
    assert.equal(parseImport('42').ok, false);
  });

  it('meldet fehlerhafte Einträge mit Position', () => {
    const result = parseImport(
      JSON.stringify({ app: 'kassetten-retten', version: 1, cassettes: [{ title: 'Gut' }, { title: '', format: 'Betamax' }] }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.startsWith('Eintrag 2') && e.includes('Titel')));
      assert.ok(result.errors.some((e) => e.includes('Betamax')));
    }
  });

  it('lehnt neuere Versionen ab', () => {
    assert.equal(parseImport(JSON.stringify({ app: 'kassetten-retten', version: 99, cassettes: [] })).ok, false);
  });

  it('ergänzt fehlende Felder und vergibt doppelte IDs neu', () => {
    const result = parseImport(JSON.stringify([{ id: 'a', title: 'Eins' }, { id: 'a', title: 'Zwei' }]));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.cassettes.length, 2);
      assert.notEqual(result.cassettes[0].id, result.cassettes[1].id);
      assert.equal(result.cassettes[1].status, 'erfasst');
      assert.equal(result.cassettes[1].format, 'unbekannt');
      assert.equal(result.warnings.length, 1);
    }
  });

  it('lehnt falsche Datentypen ab', () => {
    assert.equal(parseImport(JSON.stringify([{ title: 123 }])).ok, false);
    assert.equal(parseImport(JSON.stringify([{ title: 'x', checklist: { geprueft: 'ja' } }])).ok, false);
  });

  it('fügt beim Zusammenführen ohne ID-Konflikte hinzu', () => {
    const a = sample();
    const merged = mergeCassettes([a], [{ ...a, title: 'Kopie' }]);
    assert.equal(merged.length, 2);
    assert.notEqual(merged[0].id, merged[1].id);
  });
});
