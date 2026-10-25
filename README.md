# Kassetten retten

> Deine Erinnerungen verdienen eine Zukunft.

Eine deutschsprachige, responsive Web-App, mit der Privatpersonen und Familien ihre alten Audio- und Videokassetten erfassen, die Digitalisierung planen und die fertigen Aufnahmen sicher aufbewahren können.

Die App läuft vollständig im Browser – ohne Konto, ohne Server, ohne Tracking. **Sie digitalisiert selbst keine Kassetten**: Dafür braucht es ein passendes Abspielgerät und Aufnahmetechnik oder einen Dienstleister.

## Funktionen

- **Übersicht** – kurze Einführung, drei Schritte (Erfassen, Digitalisierung planen, Erinnerungen sichern), Fortschritt mit Zahlen und Balken, passende nächste Aktion.
- **Meine Sammlung** – Kassetten hinzufügen, bearbeiten und löschen (mit Bestätigung); Suche, Filter nach Format und Status, Karten- oder Listenansicht.
- **Sicherungscheckliste je Kassette** – Aufnahme prüfen, Datei benennen (mit Dateinamen-Vorschlag zum Kopieren), Jahr und Beschreibung dokumentieren, zweite Sicherungskopie. Sind alle Schritte erledigt, lässt sich die Sicherung bestätigen.
- **Rettungshelfer** – Fragen zu Format, Zustand und vorhandenen Geräten; daraus entsteht eine abhakbare, druckbare Checkliste. Bei Schimmel oder beschädigtem Band rät der Helfer ausdrücklich vom Abspielen ab und empfiehlt eine fachliche Begutachtung. Beide Wege – selbst digitalisieren und Dienstleister – werden erklärt.
- **Digitalisieren lassen** – Angebot von Kassetten retten (Simple7Media): unverbindliche Anfrage in vier Schritten. Kassetten werden direkt aus der Sammlung ausgewählt, weitere als Anzahl ergänzt; danach Übergabe (Abholung, Post, persönliche Abgabe), Kontakt, Prüfen und Absenden. Es folgen Auftragsnummer, Begleitzettel zum Drucken und die Kennzeichnung der Kassetten in der Sammlung.
- **Daten sichern und übertragen** – JSON-Export, JSON-Import mit Prüfung der Datei und Rückfrage (Hinzufügen oder Ersetzen), Beispieldaten nur über eine ausdrücklich gekennzeichnete Aktion, vollständiges Löschen mit Bestätigung.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 20.19 (empfohlen: 22).

```bash
npm install        # Abhängigkeiten installieren (erzeugt package-lock.json)
npm run dev        # Entwicklungsserver, meist unter http://localhost:5173
```

Weitere Befehle:

| Befehl | Zweck |
| --- | --- |
| `npm test` | Unit-Tests für Datenprüfung, Import/Export, Suche, Fortschritt und Rettungshelfer |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run build` | Produktions-Build in `dist/` |
| `npm run preview` | Den Build lokal ansehen |

Tipp: Committe nach dem ersten `npm install` die entstandene `package-lock.json`. Der Workflow nutzt dann automatisch das reproduzierbare `npm ci`.

## Veröffentlichung über GitHub Pages

1. Neues Repository auf GitHub anlegen, z. B. `kassetten-retten`.
2. Den Code hochladen:
   ```bash
   git init
   git add .
   git commit -m "Erste Version von Kassetten retten"
   git branch -M main
   git remote add origin https://github.com/<nutzername>/kassetten-retten.git
   git push -u origin main
   ```
3. Im Repository unter **Settings → Pages** bei **Source** die Option **GitHub Actions** wählen.
4. Der Workflow `.github/workflows/deploy.yml` läuft bei jedem Push auf `main`: Er installiert die Abhängigkeiten, führt die Tests aus, baut die App und veröffentlicht sie. Den Stand siehst du unter **Actions**.
5. Die App ist danach erreichbar unter `https://<nutzername>.github.io/kassetten-retten/`.

### Repository-Unterpfad und Routing

- Die App verwendet **Hash-Routing** (`…/kassetten-retten/#/sammlung`). Dadurch funktionieren Unterseiten auch beim Neuladen oder als Lesezeichen – GitHub Pages liefert keine 404-Fehler.
- `vite.config.ts` setzt `base: './'`. Alle Dateien werden relativ eingebunden, deshalb funktioniert die App unter jedem Repository-Namen, ohne dass etwas angepasst werden muss.
- Wer einen festen Pfad bevorzugt, kann beim Build `BASE_PATH` setzen, z. B. `BASE_PATH=/kassetten-retten/ npm run build`.

## Datenspeicherung

- Die Sammlung wird im `localStorage` des Browsers gespeichert (Schlüssel `kassetten-retten:sammlung:v1`). Die App weist an mehreren Stellen deutlich darauf hin.
- Daten gehen verloren, wenn die Browserdaten gelöscht werden. Deshalb gibt es den JSON-Export; das Datum der letzten Sicherung wird angezeigt.
- Wo der Browser es unterstützt, bittet die App um dauerhaften Speicher (`navigator.storage.persist()`), damit der Browser die Daten nicht von selbst aufräumt.
- Kann die gespeicherte Sammlung nicht gelesen werden, wird sie nicht überschrieben, sondern unter einem eigenen Schlüssel beiseitegelegt.
- Importdateien werden vollständig geprüft (gültiges JSON, Herkunft, Version, Pflichtfelder, erlaubte Werte, Längen, Größe ≤ 5 MB). Bei Fehlern bleibt die Sammlung unverändert und die Probleme werden mit Eintragsnummer angezeigt.

### Format der Sicherungsdatei

```json
{
  "app": "kassetten-retten",
  "version": 1,
  "exportedAt": "2026-10-25T12:00:00.000Z",
  "cassettes": [
    {
      "id": "…",
      "title": "Hochzeit Oma und Opa",
      "format": "vhs",
      "year": "1987",
      "content": "Trauung und Feier",
      "condition": "gut",
      "location": "Wohnzimmerschrank",
      "notes": "",
      "status": "erfasst",
      "checklist": { "geprueft": false, "benannt": false, "dokumentiert": false, "kopie": false },
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

Erlaubte Werte: `format` = `audio`, `vhs`, `vhs-c`, `video8`, `hi8`, `minidv`, `unbekannt` · `status` = `erfasst`, `geplant`, `in-bearbeitung`, `digitalisiert`, `gesichert` · `condition` = `unbekannt`, `gut`, `gebraucht`, `schimmel`, `beschaedigt`.

## Digitalisierung durch Kassetten retten (Simple7Media)

### Aufbau nach dem Prinzip „erst helfen, dann anbieten“

1. **Selbst loslegen:** Sammlung, Rettungshelfer und Sicherungscheckliste funktionieren vollständig ohne Anfrage.
2. **Lust wecken, an passender Stelle:** Ein dezentes Angebot erscheint nur dort, wo es hilft – wenn in der Sammlung Kassetten warten, wenn der Rettungshelfer fehlende Geräte oder „lieber abgeben“ ergibt, auf der Detailseite und (ausblendbar) auf der Übersicht. Beispieldaten lösen kein Angebot aus.
3. **Einfach anfragen:** Ein Klick übernimmt die passenden Kassetten in die Anfrage. Kontaktdaten werden auf Wunsch für das nächste Mal gemerkt.

### Konfiguration – `src/config.ts`

Alle Firmenangaben stehen an einer Stelle. Werte in `[eckigen Klammern]` sind Platzhalter. Solange welche übrig sind, zeigt der letzte Anfrageschritt einen Hinweis für den Betreiber.

| Feld | Bedeutung |
| --- | --- |
| `email`, `phone`, `address`, `openingHours` | Kontakt, Versandadresse, Zeiten für die Abgabe |
| `pickupArea` | Abholgebiet; leer lassen = keine Abholung anbieten |
| `handover` | angebotene Übergabewege |
| `deliveryOptions`, `services`, `pricing` | Lieferung der Dateien, Formate, optionale Preise (leer = „unverbindliches Angebot“) |
| `order.endpoint`, `order.extraFields` | optionaler Formular-Dienst (siehe unten) |
| `support` | optionaler Unterstützen-Link (leer = kein Button) |
| `imprint`, `privacyContact` | Impressum und Datenschutz |

### Wie die Anfrage zu euch kommt

- **Standard (ohne weitere Dienste):** Die App öffnet das E-Mail-Programm mit fertig ausgefüllter Anfrage an `email`. Als Rückfallweg lässt sich der Text kopieren. Die Person bestätigt danach in der App, dass sie die E-Mail abgeschickt hat.
- **Bequemer:** einen Formular-Dienst anbinden, der JSON per POST annimmt (z. B. Formspree oder Web3Forms), oder einen eigenen Server. Dazu `order.endpoint` setzen, bei Web3Forms zusätzlich `extraFields: { access_key: '…' }`. Die Anfrage geht dann mit einem Klick ab. Das Feld `zusammenfassung` enthält den lesbaren Text, `auftrag` die strukturierten Daten. Mit dem Dienst einen Auftragsverarbeitungsvertrag abschließen und ihn in den Datenschutzhinweisen nennen.

### Rechtliches (bitte prüfen lassen)

- Die App versendet bewusst eine **unverbindliche Anfrage**. Der Vertrag entsteht erst durch euer Angebot und dessen Annahme. So braucht die App keinen „zahlungspflichtig bestellen“-Knopf. Für Angebot und Auftrag sind AGB und Informationen zum Rücktrittsrecht nötig.
- Impressum (§ 5 ECG, § 25 MedienG) und Datenschutzhinweise sind vorbereitet, aber keine Rechtsberatung.

### Finanzierung

Die App kostet im Betrieb nichts: GitHub Pages ist kostenlos, es gibt keinen Server. Sie finanziert sich als Marketing über die Anfragen. Ein Unterstützen-Link (`support.url`, z. B. PayPal.me oder Ko-fi) ist vorbereitet und erscheint nur, wenn er gesetzt ist – in der Fußzeile, nach einer gesicherten Kassette und nach einer Anfrage.

## Projektstruktur

```
src/
  main.tsx               Einstieg
  App.tsx                Routen, Seitentitel, Fokus beim Seitenwechsel
  styles.css             Gestaltung (Farben als CSS-Variablen)
  components/            Wiederverwendbare Bausteine
    Layout.tsx           Kopfzeile, Navigation, Fußzeile, Skip-Link
    CassetteArt.tsx      Kassettenillustration (SVG)
    CassetteCard.tsx     Karte bzw. Listenzeile einer Kassette
    CassetteForm.tsx     Formular zum Erfassen und Bearbeiten
    BackupChecklist.tsx  Sicherungscheckliste je Kassette
    ProgressPanel.tsx    Fortschritt und nächste Aktion
    DataPanel.tsx        Export, Import, Beispieldaten, Löschen
    ConfirmDialog.tsx    Bestätigungsdialog (natives <dialog>)
    StorageNotice.tsx    Hinweis zur lokalen Speicherung
    Toast.tsx            Kurze Rückmeldungen (auch für Screenreader)
    ServiceTeaser.tsx    Dezentes Angebot „Digitalisieren lassen“
  config.ts              Firmendaten, Angebot, Übermittlung, Impressum
  pages/                 Übersicht, Sammlung, Detail, Formular, Rettungshelfer, Anfrage, Impressum/Datenschutz
  hooks/                 Hash-Routing, Sammlung mit Speicherung, gespeicherter Zustand
  lib/                   Reine Logik ohne React – mit Tests (*.test.ts)
.github/workflows/deploy.yml   Build und Veröffentlichung
```

## Barrierearmut

- Kontraste nach WCAG AA (Fließtext ca. 14 : 1, Buttons ≥ 5 : 1), sichtbare Fokusrahmen, Skip-Link.
- Alle Formularfelder sind beschriftet; Fehler werden am Feld und in einer Zusammenfassung angezeigt, der Fokus springt zum ersten Fehler.
- Bedienelemente sind mindestens 44 px hoch.
- Beim Seitenwechsel springt der Fokus auf die Überschrift; Meldungen werden über eine Live-Region vorgelesen.
- Animationen sind zurückhaltend und entfallen bei „Bewegung reduzieren“.

## Annahmen und Entscheidungen

- **Eigener schlanker Hash-Router statt react-router:** Drei Bereiche brauchen keine zusätzliche Bibliothek, und Hash-Routing ist die robusteste Lösung für GitHub Pages.
- **Fortschritt auf der Übersicht:** Die Navigation hat wie gewünscht drei Punkte; der Fortschritt ist Teil der „Übersicht“.
- **Aufnahmejahr als Freitext:** Familien kennen das Jahr oft nur ungefähr („um 1990“, „1980er“).
- **„Digitalisiert“ zählt gesicherte Kassetten mit**, weil eine gesicherte Kassette auch digitalisiert ist.
- **Zustand** hat die Stufen „Noch nicht geprüft“, „Gut erhalten“, „Gebrauchsspuren“, „Schimmel sichtbar“, „Band beschädigt oder gerissen“. Die letzten beiden lösen überall Warnhinweise aus.
- **Import:** Statt nur „Überschreiben ja/nein“ gibt es „Hinzufügen“ oder „Sammlung ersetzen“. Bei leerer Sammlung wird ohne Rückfrage importiert, da nichts überschrieben wird. Doppelte IDs erhalten automatisch neue.
- **Systemschriften** statt Web-Fonts: keine Anfragen an Drittanbieter, schnell und datenschutzfreundlich.
- **Dateinamen-Vorschlag:** `Jahr_titel_format.endung` (WAV für Audio, MP4 für Video) als Anregung.
- Die Hinweise zu Geräten und Formaten sind bewusst allgemein gehalten; es werden keine Preise, Anbieter oder Erfolgsquoten genannt.
- Tests nutzen den in Node eingebauten Test-Runner (über `tsx`), damit keine weitere Test-Bibliothek nötig ist.

## Lizenz

MIT
