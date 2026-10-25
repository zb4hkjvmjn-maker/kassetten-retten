import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  CONDITION_LABELS,
  FORMAT_HINTS,
  FORMAT_LABELS,
  RISKY_CONDITIONS,
  STATUS_HINTS,
  STATUS_LABELS,
} from '../lib/labels';
import { validateInput, type FieldErrors } from '../lib/validation';
import {
  CONDITION_IDS,
  FIELD_LIMITS,
  FORMAT_IDS,
  STATUS_IDS,
  type CassetteInput,
  type ConditionId,
  type FormatId,
  type StatusId,
} from '../lib/types';

interface Props {
  initial: CassetteInput;
  submitLabel: string;
  onSubmit: (input: CassetteInput) => void;
  onCancel: () => void;
}

interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}

function Field({ id, label, hint, error, optional, children }: FieldProps) {
  const hintId = hint ? `${id}-hinweis` : undefined;
  const errorId = error ? `${id}-fehler` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
      {children(describedBy)}
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

const FIELD_ORDER: (keyof CassetteInput)[] = ['title', 'format', 'year', 'content', 'condition', 'location', 'notes', 'status'];

export function CassetteForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<CassetteInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const set = <K extends keyof CassetteInput>(key: K, value: CassetteInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateInput(values);
    setErrors(found);
    const firstError = FIELD_ORDER.find((k) => found[k]);
    if (firstError) {
      document.getElementById(id(firstError))?.focus();
      return;
    }
    onSubmit(values);
  };

  const errorList = FIELD_ORDER.filter((k) => errors[k]);

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {errorList.length > 0 && (
        <div className="notice notice--error" ref={summaryRef} role="alert">
          <div>
            <p>
              <strong>Bitte prüfe deine Eingaben:</strong>
            </p>
            <ul>
              {errorList.map((k) => (
                <li key={k}>
                  <a
                    href={`#${id(k)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(id(k))?.focus();
                    }}
                  >
                    {errors[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <fieldset className="form__group">
        <legend>Das Wichtigste</legend>
        <Field id={id('title')} label="Titel" error={errors.title} hint="Ein Name, an dem du die Kassette wiedererkennst.">
          {(d) => (
            <input
              id={id('title')}
              type="text"
              value={values.title}
              onChange={(e) => set('title', e.target.value)}
              aria-describedby={d}
              aria-invalid={errors.title ? true : undefined}
              aria-required="true"
              maxLength={FIELD_LIMITS.title + 20}
              autoComplete="off"
              placeholder="z. B. Hochzeit Oma und Opa"
            />
          )}
        </Field>

        <Field id={id('format')} label="Format" error={errors.format} hint={FORMAT_HINTS[values.format]}>
          {(d) => (
            <select
              id={id('format')}
              value={values.format}
              onChange={(e) => set('format', e.target.value as FormatId)}
              aria-describedby={d}
            >
              {FORMAT_IDS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id={id('year')}
          label="Ungefähres Aufnahmejahr"
          optional
          error={errors.year}
          hint="Eine Schätzung reicht, z. B. „1994“, „um 1990“ oder „1980er“."
        >
          {(d) => (
            <input
              id={id('year')}
              type="text"
              inputMode="text"
              value={values.year}
              onChange={(e) => set('year', e.target.value)}
              aria-describedby={d}
              aria-invalid={errors.year ? true : undefined}
              maxLength={FIELD_LIMITS.year + 10}
              autoComplete="off"
            />
          )}
        </Field>

        <Field id={id('content')} label="Inhalt" optional error={errors.content} hint="Was ist zu sehen oder zu hören? Wer ist dabei?">
          {(d) => (
            <textarea
              id={id('content')}
              rows={3}
              value={values.content}
              onChange={(e) => set('content', e.target.value)}
              aria-describedby={d}
              aria-invalid={errors.content ? true : undefined}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="form__group">
        <legend>Zustand und Aufbewahrung</legend>
        <Field
          id={id('condition')}
          label="Zustand"
          hint={
            RISKY_CONDITIONS.includes(values.condition) ? (
              <span className="field__warning">
                Bitte spiele diese Kassette nicht ab. Der Rettungshelfer erklärt, wie es weitergeht.
              </span>
            ) : (
              'Sieh dir die Kassette von außen und durch das Sichtfenster an.'
            )
          }
        >
          {(d) => (
            <select
              id={id('condition')}
              value={values.condition}
              onChange={(e) => set('condition', e.target.value as ConditionId)}
              aria-describedby={d}
            >
              {CONDITION_IDS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id={id('location')} label="Lagerort" optional error={errors.location} hint="Wo liegt die Kassette, z. B. „Karton 2 im Keller“?">
          {(d) => (
            <input
              id={id('location')}
              type="text"
              value={values.location}
              onChange={(e) => set('location', e.target.value)}
              aria-describedby={d}
              aria-invalid={errors.location ? true : undefined}
              autoComplete="off"
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="form__group">
        <legend>Fortschritt</legend>
        <Field id={id('status')} label="Status" hint={STATUS_HINTS[values.status]}>
          {(d) => (
            <select
              id={id('status')}
              value={values.status}
              onChange={(e) => set('status', e.target.value as StatusId)}
              aria-describedby={d}
            >
              {STATUS_IDS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id={id('notes')} label="Notizen" optional error={errors.notes}>
          {(d) => (
            <textarea
              id={id('notes')}
              rows={4}
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              aria-describedby={d}
              aria-invalid={errors.notes ? true : undefined}
            />
          )}
        </Field>
      </fieldset>

      <div className="form__actions">
        <button type="submit" className="btn btn--primary btn--large">
          {submitLabel}
        </button>
        <button type="button" className="btn btn--secondary btn--large" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
