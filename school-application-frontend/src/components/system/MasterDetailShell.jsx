import React, { Fragment } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { FONT, BORDER, INK, INK_SOFT, INK_FAINT } from './SystemLayout';
import { core } from '../../theme/tokens';

// The list+detail record-editor pattern: a breadcrumb + toolbar row, then a
// list panel on the left and a persistent detail form on the right — no
// modals for the primary create/edit flow.
const MasterDetailShell = ({
  breadcrumb = [],
  onAdd, addLabel = '+ Add',
  onRefresh,
  search, onSearchChange,
  list, detail,
}) => (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
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
            sx={{ width: 190, '& .MuiOutlinedInput-root': { fontFamily: FONT, fontSize: '0.8rem', borderRadius: '6px', bgcolor: '#fff' } }}
          />
        )}
        {onRefresh && (
          <Box component="span" onClick={onRefresh} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: INK_SOFT, cursor: 'pointer', '&:hover': { color: core.brand } }}>
            Refresh
          </Box>
        )}
        {onAdd && (
          <Box component="span" onClick={onAdd} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: core.link, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            {addLabel}
          </Box>
        )}
      </Box>
    </Box>

    <Box sx={{
      display: 'flex', flexDirection: { xs: 'column', md: 'row' },
      border: `1px solid ${BORDER}`, borderRadius: '8px', bgcolor: '#fff', overflow: 'hidden', minHeight: 440,
    }}>
      <Box sx={{ flex: '1 1 58%', minWidth: 0, borderRight: { md: `1px solid ${BORDER}` }, borderBottom: { xs: `1px solid ${BORDER}`, md: 'none' }, overflowX: 'auto' }}>
        {list}
      </Box>
      <Box sx={{ flex: '1 1 42%', minWidth: { md: 300 }, bgcolor: '#FAFBFC', display: 'flex', flexDirection: 'column' }}>
        {detail}
      </Box>
    </Box>
  </Box>
);

export default MasterDetailShell;
