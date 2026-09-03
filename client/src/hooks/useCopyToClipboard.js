import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copy text and report success for a moment, so the button can say "Copied".
 *
 * Sharing a room code is the main way people get into a room, so this is worth
 * getting right — including the fallback, because navigator.clipboard is
 * unavailable on pages served over plain HTTP from anything but localhost.
 */
export default function useCopyToClipboard({ resetAfterMs = 2000 } = {}) {
  const [hasCopied, setHasCopied] = useState(false);
  const timeoutRef = useRef(null);

  // Clear a pending timer if the component unmounts first.
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copy = useCallback(
    async (text) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }

        setHasCopied(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setHasCopied(false), resetAfterMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetAfterMs],
  );

  return { copy, hasCopied };
}
