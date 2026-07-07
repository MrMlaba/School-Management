import React from 'react';
import { Box, Typography } from '@mui/material';
import { FONT, BORDER, INK, INK_FAINT } from './SystemLayout';

// A content block with a clear start (a heavy rule under the title) and a
// clear end (a light rule + "end of X" mark) — the literal "starts here,
// ends here" reading of the ledger-console navigation concept.
const LedgerSheet = ({ title, meta, children }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: `2px solid ${INK}`, pb: 1, mb: 2.5,
    }}>
      <Typography sx={{
        fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: INK,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {title}
      </Typography>
      {meta && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: INK_FAINT }}>
          {meta}
        </Typography>
      )}
    </Box>

    <Box>{children}</Box>

    <Box sx={{ borderTop: `1px solid ${BORDER}`, mt: 2.5, pt: 1, textAlign: 'right' }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT, fontStyle: 'italic' }}>
        end of {title}
      </Typography>
    </Box>
  </Box>
);

export default LedgerSheet;
