/**
 * The handful of icons the navigation needs, inline.
 *
 * Inline SVG rather than an icon package: four glyphs do not justify a
 * dependency, they cost nothing at runtime, and they inherit `currentColor` so
 * the active and inactive states are a text colour rather than two assets.
 *
 * Every one is decorative — the label beside it carries the meaning — so they
 * are all `aria-hidden`. An icon a screen reader announces alongside the word
 * it illustrates is read twice.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function DashboardIcon({ className = 'size-5' }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function ExpensesIcon({ className = 'size-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 3.5v17l2.5-1.5 2.5 1.5 2.5-1.5 2.5 1.5 2.5-1.5v-17l-2.5 1.5-2.5-1.5-2.5 1.5L7.5 5z" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

export function SettleIcon({ className = 'size-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8h14M13 4l4 4-4 4" />
      <path d="M21 16H7M11 20l-4-4 4-4" />
    </svg>
  );
}

export function RoomsIcon({ className = 'size-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function LogoutIcon({ className = 'size-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M15 17v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V7" />
      <path d="M10 12h10M17 9l3 3-3 3" />
    </svg>
  );
}
