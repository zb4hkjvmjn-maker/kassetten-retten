import type { ReactNode } from 'react';
import { company } from '../config';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  type?: 'text' | 'email' | 'tel' | 'date';
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}

/** Beschriftetes Eingabefeld mit Hinweis und Fehlermeldung. */
export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  type = 'text',
  autoComplete,
  inputMode,
  multiline,
  rows = 3,
  maxLength,
}: TextFieldProps) {
  const describedBy = [error ? `${id}-fehler` : '', hint ? `${id}-hinweis` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {error && (
        <p id={`${id}-fehler`} className="field__error">
          {error}
        </p>
      )}
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          inputMode={inputMode}
        />
      )}
      {hint && (
        <p id={`${id}-hinweis`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

interface ChoiceGroupProps {
  id: string;
  legend: string;
  options: ChoiceOption[];
  error?: string;
  hint?: ReactNode;
  /** Mehrfachauswahl als Chips (Checkboxen) statt einzelner Auswahl (Radio). */
  multiple?: boolean;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  layout?: 'chips' | 'cards';
}

/** Auswahlgruppe als große Karten oder kompakte Chips – immer mit echten Formularelementen. */
export function ChoiceGroup({ id, legend, options, error, hint, multiple, value, onChange, layout = 'cards' }: ChoiceGroupProps) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <fieldset className={`choice-group ${error ? 'choice-group--error' : ''}`} id={id} tabIndex={-1}>
      <legend>{legend}</legend>
      {hint && <p className="field__hint choice-group__hint">{hint}</p>}
      {error && <p className="field__error">{error}</p>}
      <div className={layout === 'chips' ? 'chip-choices' : 'choices choices--grid'}>
        {options.map((o, i) => {
          const inputId = `${id}-${i}`;
          const checked = selected.includes(o.value);
          const toggle = () => {
            if (multiple) {
              onChange(checked ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
            } else {
              onChange(o.value);
            }
          };
          if (layout === 'chips') {
            return (
              <label key={o.value} htmlFor={inputId} className={`chip-choice ${checked ? 'is-selected' : ''}`}>
                <input id={inputId} type={multiple ? 'checkbox' : 'radio'} name={id} checked={checked} onChange={toggle} />
                <span>{o.label}</span>
              </label>
            );
          }
          return (
            <div key={o.value} className={`choice ${checked ? 'is-selected' : ''}`}>
              <input
                id={inputId}
                type={multiple ? 'checkbox' : 'radio'}
                name={id}
                checked={checked}
                onChange={toggle}
                aria-describedby={o.hint ? `${inputId}-hinweis` : undefined}
              />
              <div className="choice__text">
                <label htmlFor={inputId} className="choice__label">
                  {o.label}
                </label>
                {o.hint && (
                  <span id={`${inputId}-hinweis`} className="choice__hint">
                    {o.hint}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Address() {
  return (
    <address className="company-address">
      {company.address.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </address>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Zustimmung zur Datenschutzerklärung. */
export function PrivacyCheck({ id, checked, onChange, error }: { id: string; checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div className={`check-row ${error ? 'check-row--error' : ''}`}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        Ich bin einverstanden, dass {company.companyName} meine Angaben zur Bearbeitung dieser Anfrage verwendet. Mehr dazu in
        den{' '}
        <a href="../datenschutz.html" target="_blank" rel="noopener">
          Datenschutzhinweisen
        </a>
        .
      </label>
    </div>
  );
}
