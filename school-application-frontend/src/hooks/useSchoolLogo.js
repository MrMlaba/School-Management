import { useState, useEffect } from 'react';
import API_BASE from '../config';

/**
 * Custom hook to fetch school logo from the database
 * @param {number|string} schoolId - The school ID
 * @param {string} token - Authentication token
 * @returns {object} { logoUrl, loading, error, hasLogo }
 */
export const useSchoolLogo = (schoolId, token) => {
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLogo, setHasLogo] = useState(false);

  useEffect(() => {
    if (!schoolId || !token) {
      setLoading(false);
      return;
    }

    const fetchLogo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch the logo image
        const response = await fetch(
          `${API_BASE}/api/system/schools/${schoolId}/image`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          // Convert response to blob and create object URL
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setLogoUrl(url);
          setHasLogo(true);
        } else if (response.status === 404) {
          // No logo found - this is not an error, just optional
          setHasLogo(false);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.error('Error fetching school logo:', err);
        setHasLogo(false);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();

    // Cleanup blob URL on unmount
    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
    };
  }, [schoolId, token]);

  return { logoUrl, loading, error, hasLogo };
};

export default useSchoolLogo;
