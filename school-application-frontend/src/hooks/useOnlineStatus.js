import { useState, useEffect } from 'react';

// navigator.onLine can be true on a captive portal or dead wifi, but it's
// still the best signal the browser gives us for "do I have a connection at
// all" — good enough to distinguish "definitely offline" from everything else.
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
