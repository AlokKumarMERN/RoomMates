import { useEffect, useState } from 'react';

import Logo from './Logo.jsx';

/**
 * The branded screen shown while the session is being restored.
 *
 * There is NO artificial delay. The plan asks for a splash "skipped when
 * already loaded", and the honest reading of that is: show it only when there
 * is genuinely something to wait for. The app really does have work to do on
 * boot — it re-fetches the signed-in user rather than trusting a cached copy —
 * and on a slow connection that is a second of blank page worth filling.
 *
 * On a fast one it resolves in well under the threshold, nothing renders, and
 * the user goes straight to their dashboard. A splash that sat there for a
 * fixed 1–2 seconds would be an animation charged to every single page load, in
 * the same phase whose other half is about making the app faster.
 */
const SHOW_AFTER_MS = 250;

export default function Splash() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6"
      role="status"
      aria-live="polite"
    >
      <Logo size="lg" as="text" />

      <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-200">
        {/* A determinate-looking bar would be a lie — we cannot know how long
            the session check will take. This one just shows the app is alive. */}
        <span className="block h-full w-1/3 animate-[splash_1.2s_ease-in-out_infinite] rounded-full bg-brand-500" />
      </div>

      <span className="sr-only">Signing you in</span>
    </div>
  );
}
