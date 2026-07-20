import React from 'react';
import { Box, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import useOnlineStatus from '../hooks/useOnlineStatus';

// Drop into student/parent pages only — teachers always need a live
// connection for grading/attendance, so this is deliberately not used there.
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
      background: '#FEF3C7', borderBottom: '1px solid #FDE68A',
    }}>
      <WifiOffIcon sx={{ fontSize: 17, color: '#92400E', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 600 }}>
        You're offline — showing the last saved data. Submitting work, quizzes, and messages need a connection.
      </Typography>
    </Box>
  );
}
