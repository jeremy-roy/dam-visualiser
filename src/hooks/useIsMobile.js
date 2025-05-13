import { useState, useEffect } from 'react';

/**
 * Hook to detect if the viewport width is at or below a mobile threshold (600px).
 * Returns true when window.innerWidth <= 600.
 */
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 600 : false
  );
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}