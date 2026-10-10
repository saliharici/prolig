import { useEffect, useRef, useState } from 'react';
import { activateNavigationDrawer } from './drawer';

const mobileQuery = '(max-width: 960px)';

export function useNavigationDrawer(open: boolean, onClose: () => void) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const sync = () => {
      setIsMobile(media.matches);
      if (!media.matches) onClose();
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [onClose]);

  useEffect(() => {
    if (!isMobile || !open || !panelRef.current) return;
    return activateNavigationDrawer(panelRef.current, triggerRef.current, onClose);
  }, [isMobile, open, onClose]);

  return { isMobile, panelRef, triggerRef };
}
