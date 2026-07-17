import React, { Fragment } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { FONT, BORDER, CARD, SIDEBAR, INK, INK_SOFT, INK_FAINT, TEAL } from './SystemLayout';
import { core } from '../../theme/tokens';

const MasterDetailShell = ({
  breadcrumb = [],
  onAdd, addLabel = '+ Add',
  onRefresh,
  search, onSearchChange,
  list, detail,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

    {/* Toolbar */}
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 1.5, px: 2.5, py: 1.25, flexShrink: 0,
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem' }}>
        {breadcrumb.map((b, i) => (
          <Fragment key={i}>
            {i > 0 && <Box component="span" sx={{ mx: 0.75, color: INK_FAINT }}>›</Box>}
            <Box component="span" sx={{ color: i === breadcrumb.length - 1 ? INK : INK_SOFT, fontWeight: i === breadcrumb.length - 1 ? 700 : 500 }}>
              {b}
            </Box>
          </Fragment>
        ))}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        {onSearchChange && (
          <TextField
            size="small" placeholder="Search…" value={search} onChange={e => onSearchChange(e.target.value)}
            sx={{ width: 190, '& .MuiOutlinedInput-root': { fontFamily: FONT, fontSize: '0.8rem', borderRadius: '6px' } }}
          />
        )}
        {onRefresh && (
          <Box component="span" onClick={onRefresh}
            sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: INK_SOFT, cursor: 'pointer', '&:hover': { color: TEAL } }}>
            Refresh
          </Box>
        )}
        {onAdd && (
          <Box component="span" onClick={onAdd}
            sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: TEAL, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            {addLabel}
          </Box>
        )}
      </Box>
    </Box>

    {/* List + Detail panels */}
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' },
      overflow: 'hidden', minHeight: 0,
    }}>
      <Box sx={{
        flex: '1 1 58%', minWidth: 0,
        borderRight: { md: `1px solid ${BORDER}` },
        borderBottom: { xs: `1px solid ${BORDER}`, md: 'none' },
        overflowX: 'auto', overflowY: 'auto',
        bgcolor: CARD,
      }}>
        {list}
      </Box>
      <Box sx={{
        flex: '1 1 42%', minWidth: { md: 300 },
        bgcolor: SIDEBAR,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {detail}
      </Box>
    </Box>
  </Box>
);

export default MasterDetailShell;
