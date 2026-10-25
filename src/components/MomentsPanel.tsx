import { useId, useRef, useState, type FormEvent } from 'react';
import { company } from '../config';
import { href } from '../hooks/useHashRoute';
import { MOMENT_LIMITS, type Cassette } from '../lib/types';
import { useToast } from './Toast';

interface Props {
  cassette: Cassette;
  onAdd: (time: string, text: string) => void;
  onRemove: (momentId: string) => void;
}

/** Lieblingsmomente notieren – daraus kann später ein Erinnerungsfilm werden. */
export function MomentsPanel({ cassette, onAdd, onRemove }: Props) {
  const notify = useToast();
  const uid = useId();
  const [time, setTime] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const textRef = useRef<HTMLInputElement>(null);
  const moments = cassette.moments ?? [];
  const filmPackage = company.packages.find((p) => p.film);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Beschreib kurz, was in diesem Moment passiert.');
      textRef.current?.focus();
      return;
    }
    if (moments.length >= MOMENT_LIMITS.count) {
      setError(`Es sind höchstens ${MOMENT_LIMITS.count} Lieblingsmomente möglich.`);
      return;
    }
    onAdd(time, text);
    setTime('');
    setText('');
    setError('');
    notify('Lieblingsmoment gespeichert.');
    textRef.current?.focus();
  };

  return (
    <section className="panel moments" aria-labelledby={`${uid}-titel`}>
      <h2 id={`${uid}-titel`}>Lieblingsmomente</h2>
      <p className="panel__lead">
        Welche Szenen sind dir besonders wichtig? Notiere sie hier – sie helfen beim Schneiden eines Erinnerungsfilms und
        werden bei einer Anfrage automatisch mitgeschickt.
      </p>

      {moments.length > 0 && (
        <ol className="moments__list">
          {moments.map((m) => (
            <li key={m.id}>
              <span className="moments__star" aria-hidden="true">
                ★
              </span>
              <span className="moments__text">
                {m.time && <span className="moments__time">{m.time}</span>}
                {m.text}
              </span>
              <button type="button" className="btn btn--small btn--ghost-danger" onClick={() => onRemove(m.id)} aria-label={`Entfernen: ${m.text}`}>
                Entfernen
              </button>
            </li>
          ))}
        </ol>
      )}

      <form className="moments__form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-zeit`} className="field__label">
            Ungefähre Stelle <span className="field__optional">(optional)</span>
          </label>
          <input
            id={`${uid}-zeit`}
            type="text"
            value={time}
            maxLength={MOMENT_LIMITS.time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="z. B. ca. 42 Min"
            autoComplete="off"
          />
        </div>
        <div className={`field ${error ? 'field--error' : ''}`}>
          <label htmlFor={`${uid}-text`} className="field__label">
            Was passiert da?
          </label>
          {error && (
            <p id={`${uid}-fehler`} className="field__error">
              {error}
            </p>
          )}
          <input
            ref={textRef}
            id={`${uid}-text`}
            type="text"
            value={text}
            maxLength={MOMENT_LIMITS.text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${uid}-fehler` : undefined}
            placeholder="z. B. Opa tanzt mit der Braut"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn btn--secondary">
          Moment hinzufügen
        </button>
      </form>

      {moments.length > 0 && filmPackage && (
        <p className="moments__cta">
          Aus diesen Momenten kann ein Film werden.{' '}
          <a href={href(`/auftrag?kassetten=${encodeURIComponent(cassette.id)}&paket=${encodeURIComponent(filmPackage.id)}`)}>
            {filmPackage.name} anfragen
          </a>
        </p>
      )}
    </section>
  );
}
