import { useEffect, useId, useRef, useState } from 'react';
import { useAppearance, type Schrift, type Stil } from '../hooks/useAppearance';

const STILE: { id: Stil; label: string; hint: string }[] = [
  { id: 'heimelig', label: 'Heimelig', hint: 'Warm wie ein Fotoalbum' },
  { id: 'modern', label: 'Modern', hint: 'Klar und hell' },
];

const SCHRIFTEN: { id: Schrift; label: string; sample: string }[] = [
  { id: 'normal', label: 'Normal', sample: 'A' },
  { id: 'gross', label: 'Groß', sample: 'A' },
  { id: 'sehr-gross', label: 'Sehr groß', sample: 'A' },
];

/** Umschalter für Stil und Schriftgröße in der Kopfzeile. */
export function AppearanceMenu() {
  const [appearance, setAppearance] = useAppearance();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="appearance" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="appearance__button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 19 9.5 5h1.8L17 19h-2.2l-1.4-3.8H7.5L6.1 19H4Zm4.2-5.6h4.5L10.4 7.3 8.2 13.4Z" fill="currentColor" />
          <path d="M18.5 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" fill="currentColor" opacity=".55" />
        </svg>
        <span>Ansicht</span>
      </button>
      {open && (
        <div id={panelId} className="appearance__panel" role="group" aria-label="Ansicht anpassen">
          <fieldset className="appearance__group">
            <legend>Stil</legend>
            <div className="appearance__styles">
              {STILE.map((s) => (
                <label key={s.id} className={`style-option style-option--${s.id} ${appearance.stil === s.id ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="stil"
                    value={s.id}
                    checked={appearance.stil === s.id}
                    onChange={() => setAppearance({ ...appearance, stil: s.id })}
                  />
                  <span className="style-option__preview" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="style-option__label">{s.label}</span>
                  <span className="style-option__hint">{s.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="appearance__group">
            <legend>Schriftgröße</legend>
            <div className="appearance__sizes">
              {SCHRIFTEN.map((f, i) => (
                <label key={f.id} className={`size-option ${appearance.schrift === f.id ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="schrift"
                    value={f.id}
                    checked={appearance.schrift === f.id}
                    onChange={() => setAppearance({ ...appearance, schrift: f.id })}
                  />
                  <span className="size-option__sample" style={{ fontSize: `${1 + i * 0.3}rem` }} aria-hidden="true">
                    {f.sample}
                  </span>
                  <span className="size-option__label">{f.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" className="btn btn--secondary btn--small appearance__close" onClick={() => { setOpen(false); button.current?.focus(); }}>
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}
