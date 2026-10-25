import type { PackageConfig } from '../config';

interface Props {
  packages: PackageConfig[];
  /** Mit Auswahl: Radio-Karten. Ohne: reine Übersicht mit Knopf je Paket. */
  selected?: string;
  onSelect: (id: string) => void;
  buttonLabel?: string;
  error?: string;
}

const priceText = (p: PackageConfig) => p.price || 'Preis auf Anfrage';

/** Pakete als Karten – im Anfrage-Ablauf auswählbar, auf der Übersicht als Einstieg. */
export function PackageCards({ packages, selected, onSelect, buttonLabel = 'Dieses Paket wählen', error }: Props) {
  if (selected === undefined) {
    return (
      <ul className="packages">
        {packages.map((p) => (
          <li key={p.id} className={`package ${p.highlight ? 'package--highlight' : ''}`}>
            {p.highlight && <span className="package__badge">Beliebt</span>}
            <h3 className="package__name">{p.name}</h3>
            <p className="package__tagline">{p.tagline}</p>
            <p className="package__price">{priceText(p)}</p>
            <ul className="package__includes">
              {p.includes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <button type="button" className={`btn ${p.highlight ? 'btn--primary' : 'btn--secondary'}`} onClick={() => onSelect(p.id)}>
              {buttonLabel}
              <span className="visually-hidden">: {p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <fieldset className="choice-group" id="auftrag-packageId" tabIndex={-1}>
      <legend className="visually-hidden">Paket auswählen</legend>
      {error && <p className="field__error">{error}</p>}
      <div className="packages packages--pick">
        {packages.map((p) => {
          const id = `paket-${p.id}`;
          const checked = selected === p.id;
          return (
            <div key={p.id} className={`package package--pick ${checked ? 'is-selected' : ''} ${p.highlight ? 'package--highlight' : ''}`}>
              <input type="radio" name="paket" id={id} checked={checked} onChange={() => onSelect(p.id)} aria-describedby={`${id}-info`} />
              {p.highlight && <span className="package__badge">Beliebt</span>}
              <label htmlFor={id} className="package__name">
                {p.name}
              </label>
              <div id={`${id}-info`}>
                <p className="package__tagline">{p.tagline}</p>
                <p className="package__price">{priceText(p)}</p>
                <ul className="package__includes">
                  {p.includes.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
