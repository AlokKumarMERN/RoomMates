import { useEffect, useRef, useState } from 'react';

import Button from './ui/Button.jsx';

/**
 * A destructive action that asks first, in place.
 *
 * Inline rather than a modal: removing a flatmate or archiving a room is a small
 * decision made in context, and a full-screen dialog for it is heavier than the
 * choice deserves. It reverts on its own if the user walks away from it.
 */
export default function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Yes, do it',
  isLoading = false,
  variant = 'secondary',
  size = 'sm',
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const arm = () => {
    setIsConfirming(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsConfirming(false), 5000);
  };

  if (!isConfirming) {
    return (
      <Button variant={variant} size={size} onClick={arm} isLoading={isLoading}>
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        variant="danger"
        size={size}
        isLoading={isLoading}
        onClick={() => {
          clearTimeout(timeoutRef.current);
          setIsConfirming(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button
        variant="ghost"
        size={size}
        onClick={() => {
          clearTimeout(timeoutRef.current);
          setIsConfirming(false);
        }}
      >
        Cancel
      </Button>
    </span>
  );
}
