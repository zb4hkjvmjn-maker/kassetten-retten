import { forwardRef, useId, useRef, useState } from 'react';
import type { CollectionApi } from '../hooks/useCollection';
import { useStoredState } from '../hooks/useStoredState';
import { LAST_EXPORT_KEY } from '../lib/storage';
import type { Cassette } from '../lib/types';
import { buildExport, exportFileName, MAX_IMPORT_BYTES, parseImport } from '../lib/validation';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

interface Props {
  api: CollectionApi;
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const plural = (n: number) => (n === 1 ? '1 Kassette' : `${n} Kassetten`);

/** Sicherung (Export), Übertragung (Import), Beispieldaten und vollständiges Löschen. */
export const DataPanel = forwardRef<HTMLElement, Props>(function DataPanel({ api }, ref) {
  const notify = useToast();
  const uid = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useStoredState<string | null>(LAST_EXPORT_KEY, null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<{ cassettes: Cassette[]; fileName: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const count = api.cassettes.length;
  const sampleCount = api.cassettes.filter((c) => c.sample).length;

  const handleExport = () => {
    const now = new Date();
    download(exportFileName(now), buildExport(api.cassettes, now));
    setLastExport(now.toISOString());
    notify(`Sicherung mit ${plural(count)} heruntergeladen.`);
  };

  const finishImport = (cassettes: Cassette[], mode: 'ersetzen' | 'hinzufuegen') => {
    if (mode === 'ersetzen') api.replaceAll(cassettes);
    else api.addMany(cassettes);
    setPending(null);
    notify(
      mode === 'ersetzen'
        ? `Sammlung ersetzt: ${plural(cassettes.length)} importiert.`
        : `${plural(cassettes.length)} zur Sammlung hinzugefügt.`,
    );
  };

  const handleFile = async (file: File) => {
    setImportErrors([]);
    if (file.size > MAX_IMPORT_BYTES) {
      setImportErrors(['Die Datei ist zu groß. Eine Sicherung dieser App ist deutlich kleiner als 5 MB.']);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportErrors(['Die Datei konnte nicht gelesen werden.']);
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      setImportErrors(result.errors);
      notify('Import nicht möglich – bitte sieh dir die Hinweise an.', 'fehler');
      return;
    }
    if (result.cassettes.length === 0) {
      setImportErrors(['Die Datei enthält keine Kassetten.']);
      return;
    }
    result.warnings.forEach((w) => notify(w, 'hinweis'));
    if (count === 0) {
      finishImport(result.cassettes, 'ersetzen');
    } else {
      setPending({ cassettes: result.cassettes, fileName: file.name });
    }
  };

  const shownErrors = importErrors.slice(0, 8);

  return (
    <section className="panel data-panel" aria-labelledby={`${uid}-titel`} ref={ref} tabIndex={-1}>
      <h2 id={`${uid}-titel`}>Daten sichern und übertragen</h2>
      <p className="panel__lead">
        Deine Sammlung liegt nur in diesem Browser. Mit einer Sicherungsdatei (JSON) schützt du sie vor Verlust und kannst
        sie auf ein anderes Gerät übertragen.
      </p>

      <div className="data-panel__grid">
        <div className="data-panel__block">
          <h3>Sicherung herunterladen</h3>
          {count > 0 ? (
            <>
              <p>Speichert alle {plural(count)} als Datei auf deinem Gerät.</p>
              <button type="button" className="btn btn--primary" onClick={handleExport}>
                Sicherung herunterladen
              </button>
            </>
          ) : (
            <p>Sobald du Kassetten erfasst hast, kannst du hier eine Sicherung herunterladen.</p>
          )}
          <p className="field__hint">
            {lastExport
              ? `Letzte Sicherung in diesem Browser: ${new Date(lastExport).toLocaleString('de-DE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`
              : 'Bisher wurde in diesem Browser keine Sicherung heruntergeladen.'}
          </p>
        </div>

        <div className="data-panel__block">
          <h3>Sicherung importieren</h3>
          <p>Lade eine Sicherungsdatei aus „Kassetten retten“. Vor dem Überschreiben fragen wir nach.</p>
          <input
            ref={fileInput}
            id={`${uid}-datei`}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleFile(file);
            }}
          />
          <button type="button" className="btn btn--secondary" onClick={() => fileInput.current?.click()}>
            Sicherungsdatei auswählen
          </button>
          {shownErrors.length > 0 && (
            <div className="notice notice--error" role="alert">
              <div>
                <p>
                  <strong>Diese Datei kann nicht importiert werden.</strong> Deine Sammlung bleibt unverändert.
                </p>
                <ul>
                  {shownErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {importErrors.length > shownErrors.length && (
                  <p>… und {importErrors.length - shownErrors.length} weitere Probleme.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="data-panel__block">
          <h3>Zum Ausprobieren</h3>
          <p>
            Lädt vier <strong>erfundene Beispielkassetten</strong>, damit du die App kennenlernen kannst. Sie sind mit
            „Beispiel“ markiert.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => notify(`${plural(api.loadSamples())} als Beispiel geladen.`)}
            >
              Beispieldaten laden
            </button>
            {sampleCount > 0 && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => notify(`${plural(api.removeSamples())} (Beispiele) entfernt.`)}
              >
                Beispieldaten entfernen
              </button>
            )}
          </div>
        </div>

        {count > 0 && (
          <div className="data-panel__block">
            <h3>Alles löschen</h3>
            <p>Entfernt die gesamte Sammlung aus diesem Browser. Lade vorher eine Sicherung herunter.</p>
            <button type="button" className="btn btn--ghost-danger" onClick={() => setConfirmClear(true)}>
              Gesamte Sammlung löschen
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Sicherung importieren"
        onCancel={() => setPending(null)}
        actions={
          pending
            ? [
                { label: 'Hinzufügen', variant: 'secondary', onClick: () => finishImport(pending.cassettes, 'hinzufuegen') },
                { label: 'Sammlung ersetzen', variant: 'danger', onClick: () => finishImport(pending.cassettes, 'ersetzen') },
              ]
            : []
        }
      >
        {pending && (
          <>
            <p>
              Die Datei „{pending.fileName}“ enthält {plural(pending.cassettes.length)}. In deiner Sammlung sind bereits{' '}
              {plural(count)}.
            </p>
            <p>
              <strong>Hinzufügen</strong> behält deine Einträge und ergänzt die neuen. <strong>Ersetzen</strong> löscht
              deine aktuelle Sammlung und übernimmt nur die Datei.
            </p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmClear}
        title="Gesamte Sammlung löschen?"
        onCancel={() => setConfirmClear(false)}
        actions={[
          {
            label: 'Endgültig löschen',
            variant: 'danger',
            onClick: () => {
              api.clearAll();
              setConfirmClear(false);
              notify('Die Sammlung wurde gelöscht.');
            },
          },
        ]}
      >
        <p>
          Alle {plural(count)} werden aus diesem Browser entfernt. Das kann nicht rückgängig gemacht werden – außer du hast
          eine Sicherungsdatei.
        </p>
      </ConfirmDialog>
    </section>
  );
});
