import { useEffect, useRef, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { useToast } from './components/Toast';
import { useCollection } from './hooks/useCollection';
import { useRoute } from './hooks/useHashRoute';
import { CollectionPage } from './pages/CollectionPage';
import { DetailPage } from './pages/DetailPage';
import { FormPage } from './pages/FormPage';
import { HelperPage } from './pages/HelperPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderPage } from './pages/OrderPage';
import { OverviewPage } from './pages/OverviewPage';
import { VoucherPage } from './pages/VoucherPage';

const APP_NAME = 'Kassetten retten';

export function App() {
  const route = useRoute();
  const api = useCollection();
  const notify = useToast();
  const previousPath = useRef<string | null>(null);
  const [first, second, third] = route.segments;

  let page: ReactNode;
  let title: string;
  if (route.path === '/') {
    page = <OverviewPage api={api} />;
    title = 'Übersicht';
  } else if (first === 'sammlung' && !second) {
    page = <CollectionPage api={api} route={route} />;
    title = 'Meine Sammlung';
  } else if (first === 'sammlung' && second === 'neu' && !third) {
    page = <FormPage api={api} />;
    title = 'Kassette erfassen';
  } else if (first === 'sammlung' && second && !third) {
    page = <DetailPage key={second} api={api} id={second} />;
    title = api.cassettes.find((c) => c.id === second)?.title ?? 'Kassette';
  } else if (first === 'sammlung' && second && third === 'bearbeiten' && route.segments.length === 3) {
    page = <FormPage api={api} id={second} />;
    title = 'Kassette bearbeiten';
  } else if (first === 'rettungshelfer' && !second) {
    page = <HelperPage api={api} route={route} />;
    title = 'Rettungshelfer';
  } else if (first === 'auftrag' && !second) {
    page = <OrderPage api={api} route={route} />;
    title = 'Digitalisieren lassen';
  } else if (first === 'gutschein' && !second) {
    page = <VoucherPage route={route} />;
    title = 'Gutschein anfragen';
  } else if ((first === 'impressum' || first === 'datenschutz') && !second) {
    // Impressum und Datenschutz sind eigene Seiten neben der App.
    window.location.replace(`../${first}.html`);
    page = null;
    title = first === 'impressum' ? 'Impressum' : 'Datenschutz';
  } else {
    page = <NotFoundPage />;
    title = 'Nicht gefunden';
  }

  useEffect(() => {
    document.title = `${title} – ${APP_NAME}`;
  }, [title]);

  // Bei Seitenwechsel nach oben scrollen und Fokus auf die Überschrift setzen (wichtig für Screenreader).
  useEffect(() => {
    if (previousPath.current !== null && previousPath.current !== route.path) {
      window.scrollTo(0, 0);
      document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
    }
    previousPath.current = route.path;
  }, [route.path]);

  // Probleme beim Laden oder Speichern deutlich melden.
  useEffect(() => {
    if (api.loadProblem) notify(api.loadProblem, 'fehler');
  }, [api.loadProblem, notify]);

  return (
    <Layout path={route.path}>
      {api.saveFailed && (
        <div className="notice notice--error" role="alert">
          <div>
            <p>
              <strong>Speichern hat nicht geklappt.</strong> Möglicherweise ist der Speicher des Browsers voll oder
              gesperrt. Lade bitte sofort eine Sicherung herunter, damit nichts verloren geht.
            </p>
          </div>
        </div>
      )}
      {page}
    </Layout>
  );
}
