import { CassetteArt } from '../components/CassetteArt';
import { ProgressPanel } from '../components/ProgressPanel';
import { ServiceTeaser } from '../components/ServiceTeaser';
import { StorageNotice } from '../components/StorageNotice';
import { useToast } from '../components/Toast';
import type { CollectionApi } from '../hooks/useCollection';
import { href } from '../hooks/useHashRoute';

const STEPS = [
  {
    title: 'Erfassen',
    text: 'Trag deine Kassetten ein: Was ist drauf, aus welchem Jahr, wo liegt sie? So behältst du den Überblick.',
    link: { label: 'Kassette erfassen', path: '/sammlung/neu' },
  },
  {
    title: 'Digitalisierung planen',
    text: 'Der Rettungshelfer klärt mit dir Format, Zustand und Geräte – und ob du selbst digitalisierst oder es uns überlässt.',
    link: { label: 'Zum Rettungshelfer', path: '/rettungshelfer' },
  },
  {
    title: 'Erinnerungen sichern',
    text: 'Prüfen, benennen, beschreiben und doppelt speichern: Mit der Sicherungscheckliste bleiben die Dateien dauerhaft erhalten.',
    link: { label: 'Zur Sammlung', path: '/sammlung' },
  },
];

export function OverviewPage({ api }: { api: CollectionApi }) {
  const notify = useToast();
  const count = api.cassettes.length;

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">Kassetten retten</p>
          <h1 tabIndex={-1}>Deine Erinnerungen verdienen eine Zukunft.</h1>
          <p className="hero__lead">
            Auf alten Kassetten stecken Familienfeiern, Kinderstimmen, Urlaube und Lieblingslieder. Magnetbänder altern –
            mit jedem Jahr wird es wichtiger, sie zu retten. Diese App hilft dir, deine Kassetten zu ordnen und Schritt
            für Schritt in eine sichere digitale Zukunft zu bringen.
          </p>
          <div className="button-row">
            <a className="btn btn--primary btn--large" href={href('/sammlung/neu')}>
              Meine Kassetten erfassen
            </a>
            <a className="btn btn--secondary btn--large" href={href('/sammlung')}>
              {count > 0 ? `Zu meiner Sammlung (${count})` : 'Zu meiner Sammlung'}
            </a>
          </div>
          <ul className="trust-list">
            <li>Kostenlos</li>
            <li>Ohne Anmeldung</li>
            <li>Deine Daten bleiben bei dir</li>
          </ul>
        </div>
        <div className="hero__art">
          <div className="hero__stack" aria-hidden="true">
            <CassetteArt className="hero__back" label="Urlaub 1994" />
            <CassetteArt className="hero__front" label="Erinnerungen" animated />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="schritte-titel">
        <h2 id="schritte-titel">In drei Schritten zur Rettung</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step">
              <span className="step__number" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <a href={href(step.link.path)} className="text-link">
                {step.link.label} <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {count > 0 && (
        <ServiceTeaser
          title="Keine Zeit oder keine Geräte? Wir retten deine Kassetten für dich."
          text="Wähle die Kassetten direkt aus deiner Sammlung, bestimme, wie sie zu uns kommen, und erhalte ein unverbindliches Angebot."
          dismissKey="uebersicht"
        />
      )}

      <div className="two-col">
        <ProgressPanel cassettes={api.cassettes} />
        <div className="stack">
          {count === 0 && (
            <section className="panel" aria-labelledby="ausprobieren-titel">
              <h2 id="ausprobieren-titel">Erst einmal ausprobieren?</h2>
              <p>
                Deine Sammlung ist noch leer. Du kannst direkt deine erste Kassette erfassen – oder vier{' '}
                <strong>erfundene Beispielkassetten</strong> laden, um die App kennenzulernen. Beispiele sind markiert und
                lassen sich jederzeit wieder entfernen.
              </p>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => notify(`${api.loadSamples()} Beispielkassetten geladen.`)}
              >
                Beispieldaten laden
              </button>
            </section>
          )}
          <aside className="notice notice--warm" aria-label="Was diese App kann">
            <div>
              <p>
                <strong>Gut zu wissen:</strong> Diese App digitalisiert keine Kassetten. Sie hilft dir beim Ordnen und
                Planen. Für die Überspielung brauchst du ein passendes Abspielgerät und Aufnahmetechnik – oder du{' '}
                <a href={href('/auftrag')}>lässt sie von uns digitalisieren</a>.
              </p>
            </div>
          </aside>
          <StorageNotice />
        </div>
      </div>
    </>
  );
}
