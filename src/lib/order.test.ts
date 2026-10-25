import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { company, configIssues } from '../config';
import { createCassette, emptyInput } from './collection';
import {
  buildPayload,
  createOrderRef,
  createVoucherRef,
  EMPTY_DRAFT,
  EMPTY_FILM,
  EMPTY_MUSIC,
  EMPTY_VOUCHER,
  normalizeDraft,
  stepsFor,
  validateFilm,
  validateMusic,
  validatePackage,
  validateVoucher,
  voucherText,
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
      region: 'Wien',
      about: { name: 'Max', role: 'Gründer', text: 'Ich rette Kassetten.' },
      packages: company.packages.map((p) => ({ ...p, price: 'ab 20 €' })),
      extras: company.extras.map((e) => ({ ...e, price: '10 €' })),
      voucher: { ...company.voucher, values: ['50 €'] },
    };
    assert.deepEqual(configIssues(filled), []);
  });
});

describe('Pakete, Film und Musik', () => {
  it('fragt Film und Musik nur bei passenden Paketen ab', () => {
    assert.deepEqual(stepsFor(company, draft({ packageId: 'digital' })), ['kassetten', 'paket', 'uebergabe', 'kontakt', 'absenden']);
    assert.deepEqual(stepsFor(company, draft({ packageId: 'anlassfilm' })), [
      'kassetten',
      'paket',
      'film',
      'musik',
      'uebergabe',
      'kontakt',
      'absenden',
    ]);
  });

  it('prüft Paket, Anlass und Musikwünsche', () => {
    assert.ok(validatePackage(draft({}), company).packageId);
    assert.ok(validateFilm(draft({})).occasion);
    const m = validateMusic(draft({}));
    assert.ok(m.moods && m.vocals);
    const personal = validateMusic(draft({ music: { ...EMPTY_MUSIC, moods: ['Fröhlich'], vocals: 'persoenlich' } }));
    assert.ok(personal.lyrics);
    assert.deepEqual(validateMusic(draft({ music: { ...EMPTY_MUSIC, moods: ['Fröhlich'], vocals: 'persoenlich', names: 'Anna und Paul' } })), {});
  });

  it('übernimmt Paket, Wünsche und Lieblingsmomente in die Anfrage', () => {
    const c = { ...a, moments: [{ id: 'm1', time: 'ca. 42 Min', text: 'Opa tanzt' }] };
    const p = buildPayload(
      draft({
        selected: [c.id],
        packageId: 'anlassfilm',
        extras: ['usb-box'],
        film: { ...EMPTY_FILM, occasion: 'Hochzeitstag oder Jubiläum', forWhom: 'Oma und Opa', message: 'Danke für 50 Jahre', messageStyle: 'Als Texteinblendung' },
        music: { ...EMPTY_MUSIC, moods: ['Berührend'], genre: 'Klavier solo', vocals: 'persoenlich', names: 'Maria und Josef', language: 'Deutsch' },
        handover: 'abgabe',
      }),
      [c],
      'KR-T',
      new Date(),
      company,
    );
    const text = orderText(p, 'Kassetten retten');
    for (const part of ['PAKET', 'Anlassfilm', 'USB-Stick', 'FILMWÜNSCHE', 'Oma und Opa', 'MUSIKWÜNSCHE', 'Berührend', 'Persönliches Lied (Deutsch)', 'Maria und Josef', '★ ca. 42 Min: Opa tanzt']) {
      assert.ok(text.includes(part), `fehlt: ${part}`);
    }
  });

  it('bringt alte Entwürfe auf den aktuellen Stand', () => {
    const d = normalizeDraft({ selected: ['x'], contact: { name: 'Eva' } as never });
    assert.deepEqual(d.music.moods, []);
    assert.equal(d.contact.email, '');
    assert.equal(d.packageId, '');
  });
});

describe('Gutschein', () => {
  it('prüft Pflichtangaben und Adresse nur bei Postversand', () => {
    const contact = { name: 'Eva', email: 'eva@beispiel.at', phone: '', street: '', zip: '', city: '' };
    const base = { ...EMPTY_VOUCHER, value: 'Erinnerungsfilm', recipient: 'Mama', delivery: 'Als PDF per E-Mail', contact, privacyAccepted: true };
    assert.deepEqual(validateVoucher(base), {});
    assert.ok(validateVoucher({ ...base, delivery: 'Gedruckte Karte per Post' }).street);
    assert.ok(validateVoucher({ ...base, recipient: '' }).recipient);
    const text = voucherText(base, createVoucherRef(new Date(2026, 10, 1), () => 0), 'Kassetten retten');
    assert.ok(text.includes('GS-20261101-AAAA') && text.includes('Für: Mama'));
  });
});
