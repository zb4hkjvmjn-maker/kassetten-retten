interface Props {
  /** Beschriftung auf dem Etikett, z. B. das Format. */
  label?: string;
  /** Spulen drehen sich langsam (wird bei „weniger Bewegung“ automatisch abgeschaltet). */
  animated?: boolean;
  className?: string;
}

function Reel({ cx }: { cx: number }) {
  return (
    <g className="cassette-art__reel" style={{ transformOrigin: `${cx}px 53px` }}>
      <circle cx={cx} cy={53} r={11} fill="var(--reel)" />
      <circle cx={cx} cy={53} r={4} fill="var(--window)" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect
          key={deg}
          x={cx - 1.2}
          y={42.5}
          width={2.4}
          height={4.5}
          rx={1}
          fill="var(--window)"
          transform={`rotate(${deg} ${cx} 53)`}
        />
      ))}
    </g>
  );
}

/** Dezente, wiederkehrende Kassettenillustration (rein dekorativ). */
export function CassetteArt({ label, animated = false, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 200 128"
      className={`cassette-art ${animated ? 'cassette-art--animated' : ''} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect x={3} y={3} width={194} height={122} rx={12} fill="var(--tape-body)" stroke="var(--tape-edge)" strokeWidth={2} />
      <circle cx={13} cy={13} r={2.5} fill="var(--tape-edge)" />
      <circle cx={187} cy={13} r={2.5} fill="var(--tape-edge)" />
      <circle cx={13} cy={115} r={2.5} fill="var(--tape-edge)" />
      <circle cx={187} cy={115} r={2.5} fill="var(--tape-edge)" />
      <rect x={20} y={14} width={160} height={76} rx={6} fill="var(--tape-label)" />
      <rect x={20} y={14} width={160} height={9} rx={4} fill="var(--accent)" />
      <rect x={20} y={19} width={160} height={4} fill="var(--accent)" />
      {label ? (
        <text x={100} y={35} textAnchor="middle" className="cassette-art__text">
          {label}
        </text>
      ) : (
        <rect x={40} y={29} width={120} height={3} rx={1.5} fill="var(--tape-line)" />
      )}
      <rect x={48} y={40} width={104} height={26} rx={13} fill="var(--window)" />
      <rect x={84} y={46} width={32} height={14} rx={3} fill="var(--tape-brown)" opacity={0.85} />
      <Reel cx={70} />
      <Reel cx={130} />
      <rect x={40} y={74} width={120} height={3} rx={1.5} fill="var(--tape-line)" />
      <path d="M46 125 L58 100 H142 L154 125 Z" fill="var(--tape-edge)" opacity={0.55} />
      <circle cx={78} cy={113} r={3.5} fill="var(--tape-body)" />
      <circle cx={122} cy={113} r={3.5} fill="var(--tape-body)" />
    </svg>
  );
}
