import { href } from '../hooks/useHashRoute';

interface Props {
  compact?: boolean;
  /** Wenn gesetzt, springt der Link direkt zum Sicherungsbereich auf derselben Seite. */
  onBackupClick?: () => void;
}

/** Deutlicher Hinweis: Daten liegen nur in diesem Browser. */
export function StorageNotice({ compact = false, onBackupClick }: Props) {
  return (
    <aside className={`notice notice--info ${compact ? 'notice--compact' : ''}`} aria-label="Hinweis zur Speicherung">
      <svg className="notice__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 7Zm1.5 10h-3v-1.5h.75V12h-.75v-1.5h2.25v5h.75Z"
          fill="currentColor"
        />
      </svg>
      <div>
        <p>
          <strong>Deine Daten bleiben bei dir:</strong> Die Sammlung wird nur in diesem Browser auf diesem Gerät
          gespeichert – nicht im Internet. Wenn du die Browserdaten löschst, ist sie weg.
        </p>
        <p>
          Lade deshalb regelmäßig eine{' '}
          <a
            href={href('/sammlung?bereich=sicherung')}
            onClick={
              onBackupClick
                ? (e) => {
                    e.preventDefault();
                    onBackupClick();
                  }
                : undefined
            }
          >
            Sicherungsdatei
          </a>{' '}
          herunter.
          {!compact && ' Damit kannst du die Sammlung auch auf ein anderes Gerät übertragen.'}
        </p>
      </div>
    </aside>
  );
}
