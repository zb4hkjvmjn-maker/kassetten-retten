import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { company, configIssues } from '../config';
import { createCassette, emptyInput } from './collection';
import {
  buildPayload,
  createOrderRef,
  EMPTY_DRAFT,
  mailtoLink,
  orderText,
  parseExtraCount,
  validateContact,
  validateFinal,
  validateSelection,
  type OrderDraft,
} from './order';

const a = createCassette({ ...emptyInput(), title: 'Hochzeit', format: 'vhs', year: '1987' });
const b = createCassette({ ...emptyInput(), title: 'Lieder', format: 'audio', condition: 'schimmel' });

const draft = (patch: Partial<OrderDraft>): OrderDraft => ({ ...EMPTY_DRAFT, ...patch, contact: { ...EMPTY_DRAFT.contact, ...patch.contact } });

describe('Auftrag', () => {
  it('verlangt Kassetten oder eine Anzahl', () => {
    assert.ok(validateSelection(draft({})).selected);
    assert.deepEqual(validateSelection(draft({ extraCount: '3' })), {});
    assert.deepEqual(validateSelection(draft({ selected: [a.id] })), {});
    assert.ok(validateSelection(draft({ extraCount: 'viele' })).extraCount);
    assert.equal(parseExtraCount(' 12 '), 12);
    assert.equal(parseExtraCount('501'), null);
  });

  it('verlangt die Adresse nur bei Abholung und Versand', () => {
    const contact = { name: 'Eva', email: 'eva@beispiel.at', phone: '', street: '', zip: '', city: '' };
    assert.deepEqual(validateContact(draft({ handover: 'abgabe', contact })), {});
    const e = validateContact(draft({ handover: 'abholung', contact }));
    assert.ok(e.street && e.zip && e.city);
    assert.ok(validateContact(draft({ handover: 'abgabe', contact: { ...contact, email: 'kein-at' } })).email);
  });

  it('verlangt die Zustimmung zum Datenschutz', () => {
    const ok = draft({
      selected: [a.id],
      handover: 'abgabe',
      contact: { name: 'Eva', email: 'eva@beispiel.at', phone: '', street: '', zip: '', city: '' },
    });
    assert.ok(validateFinal(ok).privacy);
    assert.deepEqual(validateFinal({ ...ok, privacyAccepted: true }), {});
  });

  it('nummeriert die Kassetten und fasst alles verständlich zusammen', () => {
    const p = buildPayload(
      draft({
        selected: [a.id, b.id],
        extraCount: '2',
        handover: 'versand',
        contact: { name: 'Eva', email: 'eva@beispiel.at', phone: '', street: 'Hauptstr. 1', zip: '1010', city: 'Wien' },
      }),
      [a, b],
      'KR-TEST',
    );
    assert.deepEqual(p.cassettes.map((c) => c.number), [1, 2]);
    const text = orderText(p, 'Kassetten retten');
    assert.ok(text.includes('KR-TEST'));
    assert.ok(text.includes('1. Hochzeit (VHS, 1987'));
    assert.ok(text.includes('Schimmel sichtbar'));
    assert.ok(text.includes('4 insgesamt'));
    assert.ok(text.includes('Hauptstr. 1, 1010 Wien'));
  });

  it('kürzt sehr lange E-Mails', () => {
    const many = Array.from({ length: 80 }, (_, i) => createCassette({ ...emptyInput(), title: `Kassette Nummer ${i}`, content: 'x'.repeat(40) }));
    const p = buildPayload(draft({ selected: many.map((c) => c.id), handover: 'abgabe' }), many, 'KR-X');
    const { href, truncated } = mailtoLink('a@b.at', p, 'Kassetten retten');
    assert.ok(truncated);
    assert.ok(href.startsWith('mailto:a@b.at?subject='));
  });

  it('erzeugt lesbare Auftragsnummern', () => {
    assert.match(createOrderRef(new Date(2026, 9, 25), () => 0), /^KR-20261025-AAAA$/);
  });

  it('meldet offene Platzhalter in der Firmenkonfiguration', () => {
    assert.ok(configIssues(company).length > 0);
    const filled = {
      ...company,
      email: 'auftrag@firma.at',
      phone: '+43 1 234',
      address: ['Firma', 'Gasse 1', '1010 Wien'],
      openingHours: 'Mo–Fr 9–17 Uhr',
      pickupArea: 'Wien',
      imprint: { owner: 'A', businessPurpose: 'B', vatId: 'C', companyRegister: 'D', authority: 'E', chamber: 'F' },
      privacyContact: 'datenschutz@firma.at',
    };
    assert.deepEqual(configIssues(filled), []);
  });
});
