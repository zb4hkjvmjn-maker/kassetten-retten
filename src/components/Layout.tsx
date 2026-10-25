import type { ReactNode } from 'react';
import { company } from '../config';
import { href } from '../hooks/useHashRoute';
import { AppearanceMenu } from './AppearanceMenu';
import { CassetteArt } from './CassetteArt';

const NAV = [
  { path: '/', label: 'Übersicht', match: (p: string) => p === '/' },
  { path: '/sammlung', label: 'Meine Sammlung', match: (p: string) => p.startsWith('/sammlung') },
  { path: '/rettungshelfer', label: 'Rettungs\u00adhelfer', match: (p: string) => p.startsWith('/rettungshelfer') },
];

interface Props {
  path: string;
  children: ReactNode;
}

export function Layout({ path, children }: Props) {
  return (
    <div className="app">
      <a
        className="skip-link"
        href="#inhalt"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('inhalt');
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Zum Inhalt springen
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href={href('/')}>
            <CassetteArt className="brand__icon" />
            <span className="brand__name">Kassetten retten</span>
          </a>
          <div className="header-tools">
            <AppearanceMenu />
            <a
            className={`btn btn--primary btn--small header-cta ${path.startsWith('/auftrag') ? 'is-active' : ''}`}
            href={href('/auftrag')}
            aria-current={path.startsWith('/auftrag') ? 'page' : undefined}
          >
            Digitalisieren lassen
            </a>
          </div>
          <nav aria-label="Hauptnavigation" className="main-nav">
            <ul>
              {NAV.map((item) => {
                const active = item.match(path);
                return (
                  <li key={item.path}>
                    <a href={href(item.path)} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main id="inhalt" className="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div>
            <p>
              <strong>{company.brandName}</strong> – Deine Erinnerungen verdienen eine Zukunft. Ein Angebot von {company.companyName}.
            </p>
            <p>
              Ohne Konto, ohne Tracking: Deine Sammlung wird ausschließlich in diesem Browser gespeichert.{' '}
              <a href={href('/sammlung?bereich=sicherung')}>Sicherung verwalten</a>
            </p>
          </div>
          <ul className="footer-links">
            <li>
              <a href={href('/auftrag')}>Digitalisieren lassen</a>
            </li>
            <li>
              <a href={href('/impressum')}>Impressum</a>
            </li>
            <li>
              <a href={href('/datenschutz')}>Datenschutz</a>
            </li>
            {company.support.url && (
              <li>
                <a href={company.support.url} target="_blank" rel="noopener noreferrer">
                  {company.support.label}
                </a>
              </li>
            )}
          </ul>
        </div>
      </footer>
    </div>
  );
}
