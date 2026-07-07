import React from 'react';
import { Box, Typography } from '@mui/material';
import { FONT, INK_FAINT } from './SystemLayout';

// A label-left / value-right row for a record detail form.
const RecordField = ({ label, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
    <Typography sx={{
      width: 110, flexShrink: 0, pt: '9px',
      fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, color: INK_FAINT,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {label}
    </Typography>
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Box>
);

export default RecordField;
