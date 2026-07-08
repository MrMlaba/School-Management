import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useSchoolLogo from '../hooks/useSchoolLogo';

/**
 * School Logo Header Component
 * Displays the school logo with optional school name
 * @param {number|string} schoolId - The school ID
 * @param {string} token - Authentication token (can be teacher, admin, or student token)
 * @param {string} schoolName - Optional school name to display
 * @param {object} sx - Additional MUI sx props
 * @param {number} logoHeight - Logo height in pixels (default: 60)
 */
const SchoolLogoHeader = ({
  schoolId,
  token,
  schoolName = '',
  sx = {},
  logoHeight = 60
}) => {
  const { logoUrl, loading, hasLogo } = useSchoolLogo(schoolId, token);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          ...sx
        }}
      >
        <CircularProgress size={logoHeight} />
        {schoolName && (
          <Typography sx={{ fontSize: '0.9rem', color: '#666' }}>
            Loading...
          </Typography>
        )}
      </Box>
    );
  }

  // If logo exists, display it
  if (hasLogo && logoUrl) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          ...sx
        }}
      >
        <Box
          component="img"
          src={logoUrl}
          alt={schoolName || 'School Logo'}
          sx={{
            height: logoHeight,
            width: 'auto',
            maxWidth: logoHeight * 1.5,
            objectFit: 'contain',
            borderRadius: '4px'
          }}
        />
        {schoolName && (
          <Box>
            <Typography
              sx={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#000000',
                fontFamily: "'IBM Plex Sans', sans-serif"
              }}
            >
              {schoolName}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // If no logo, optionally show school name or nothing
  if (schoolName) {
    return (
      <Box sx={{ ...sx }}>
        <Typography
          sx={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#1A3557',
            fontFamily: "'IBM Plex Sans', sans-serif"
          }}
        >
          {schoolName}
        </Typography>
      </Box>
    );
  }

  return null;
};

export default SchoolLogoHeader;
