const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function activateNavigationDrawer(panel: HTMLElement, trigger: HTMLElement | null, onClose: () => void) {
  const previousFocus = document.activeElement as HTMLElement | null;
  const body = document.body;
  const scrollY = window.scrollY;
  const savedStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  };
  Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: '-' + scrollY + 'px', width: '100%' });

  const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert], [aria-hidden="true"]') && element.getClientRects().length > 0);
  const focusFirst = () => (focusable()[0] ?? panel).focus({ preventScroll: true });
  focusFirst();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = focusable();
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first) {
      event.preventDefault();
      panel.focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleFocusIn = (event: FocusEvent) => {
    if (!panel.contains(event.target as Node)) focusFirst();
  };
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('focusin', handleFocusIn);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('focusin', handleFocusIn);
    Object.assign(body.style, savedStyles);
    window.scrollTo(0, scrollY);
    const candidates = [previousFocus, trigger, panel.querySelector<HTMLElement>('[aria-current="page"]')];
    const target = candidates.find(element => element?.isConnected && !element.closest('[inert], [aria-hidden="true"]') && element.getClientRects().length > 0);
    target?.focus({ preventScroll: true });
  };
}
