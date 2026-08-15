import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to top on every route change.
 * Place inside <BrowserRouter> to auto-scroll on navigation.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Also scroll the main content container if it exists
    const main = document.querySelector('main .custom-scrollbar');
    if (main) main.scrollTop = 0;
  }, [pathname]);

  return null;
}
