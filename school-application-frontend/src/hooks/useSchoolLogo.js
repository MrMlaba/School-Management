import { useState, useEffect } from 'react';
import API_BASE from '../config';

/**
 * Custom hook to fetch a school's LOGO from the database.
 * (This is the dedicated logo in school_logos — NOT the home-page picture.)
 *
 * @param {number|string} schoolId - The school ID
 * @param {string} token - Authentication token (optional; the logo endpoint is public)
 * @returns {object} { logoUrl, loading, error, hasLogo }
 */
export const useSchoolLogo = (schoolId, token) => {
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [hasLogo, setHasLogo] = useState(false);

  useEffect(() => {
    // The /logo endpoint is public, so we only require a schoolId.
    if (!schoolId) {
      setLoading(false);
      setHasLogo(false);
      setLogoUrl(null);
      return;
    }

    let objectUrl = null;   // the blob URL we create, so we can revoke exactly it
    let cancelled = false;  // guard against setting state after unmount

    const fetchLogo = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(
          `${API_BASE}/api/system/schools/${schoolId}/logo`,
          { method: 'GET', headers }
        );

        if (response.ok) {
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setLogoUrl(objectUrl);
            setHasLogo(true);
          }
        } else if (response.status === 404) {
          // No logo set for this school — this is fine, the logo is optional.
          if (!cancelled) { setHasLogo(false); setLogoUrl(null); }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.error('Error fetching school logo:', err);
        if (!cancelled) { setHasLogo(false); setError(err); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLogo();

    // Cleanup: revoke the exact blob URL this effect created
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [schoolId, token]);

  return { logoUrl, loading, error, hasLogo };
};

export default useSchoolLogo;