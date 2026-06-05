import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip,
  CircularProgress, Stack, TextField, MenuItem, Select,
  FormControl, InputLabel, Button, InputAdornment,
} from '@mui/material';
import SearchIcon  from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SystemLayout, { FONT, BLUE } from '../../components/system/SystemLayout';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => localStorage.getItem('systemToken');
const hdr   = () => ({ Authorization: `Bearer ${token()}` });

const ACTION_COLORS = {
  LOGIN:                  'info',
  SYSTEM_LOGIN:           'info',
  CHANGE_PASSWORD:        'warning',
  RESET_PASSWORD:         'warning',
  CREATE_ADMIN:           'success',
  DELETE_ADMIN:           'error',
  SUSPEND_ADMIN:          'error',
  REACTIVATE_ADMIN:       'success',
  CREATE_SCHOOL:          'success',
  UPDATE_SCHOOL:          'warning',
  APPROVED_APPLICATION:   'success',
  REJECTED_APPLICATION:   'error',
  PENDING_APPLICATION:    'default',
  ACCEPTED_APPLICATION:   'success',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONT, fontSize: '0.82rem', borderRadius: '7px', bgcolor: '#fff',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT, fontSize: '0.82rem', color: '#94a3b8' },
  '& .MuiInputLabel-root.Mui-focused': { color: BLUE },
};

const SystemLogsPage = () => {
  const [logs, setLogs]         = useState([]);
  const [schools, setSchools]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterRole, setFilterRole]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 200 });
    if (filterSchool) params.append('school', filterSchool);
    Promise.all([
      fetch(`${API}/api/system/logs?${params}`, { headers: hdr() }).then(r => r.json()),
      fetch(`${API}/api/system/schools`, { headers: hdr() }).then(r => r.json()),
    ]).then(([l, s]) => { setLogs(Array.isArray(l) ? l : []); setSchools(Array.isArray(s) ? s : []); })
      .finally(() => setLoading(false));
  }, [filterSchool]);

  useEffect(() => { load(); }, [load]);

  // Client-side search and role filter on top of server-filtered results
  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.actor?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.target?.toLowerCase().includes(search.toLowerCase()) ||
      l.school?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || l.actor_role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <SystemLayout title="Audit Log" subtitle="Complete history of all actions performed in the system">

      {/* ── Filters toolbar ── */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: '#fff', mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <TextField
              size="small" placeholder="Search actor, action, target…" sx={{ ...fieldSx, flex: 2 }}
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>,
              }}
            />
            <FormControl size="small" sx={{ ...fieldSx, minWidth: 160 }}>
              <InputLabel>School</InputLabel>
              <Select value={filterSchool} label="School" onChange={e => setFilterSchool(e.target.value)}>
                <MenuItem value=""><em>All schools</em></MenuItem>
                {schools.map(s => (
                  <MenuItem key={s.id} value={s.name} sx={{ fontFamily: FONT, fontSize: '0.82rem' }}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ ...fieldSx, minWidth: 140 }}>
              <InputLabel>Role</InputLabel>
              <Select value={filterRole} label="Role" onChange={e => setFilterRole(e.target.value)}>
                <MenuItem value=""><em>All roles</em></MenuItem>
                <MenuItem value="school_admin"  sx={{ fontFamily: FONT, fontSize: '0.82rem' }}>School Admin</MenuItem>
                <MenuItem value="system_admin"  sx={{ fontFamily: FONT, fontSize: '0.82rem' }}>System Admin</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={load}
              sx={{
                fontFamily: FONT, fontWeight: 600, fontSize: '0.8rem',
                textTransform: 'none', borderRadius: '7px',
                borderColor: '#e2e8f0', color: '#64748b',
                '&:hover': { borderColor: BLUE, color: BLUE },
                flexShrink: 0,
              }}>
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Log table ── */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: '#fff' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              Activity Records
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: '#94a3b8' }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: BLUE }} size={28} />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Time', 'Actor', 'Role', 'Action', 'Target', 'School'].map(h => (
                      <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem', color: '#94a3b8', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', py: 1.25 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id} hover sx={{ '& td': { py: 1.25 }, '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1e293b', fontWeight: 600 }}>
                        {log.actor}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.actor_role === 'system_admin' ? 'System' : 'School'}
                          size="small"
                          sx={{
                            fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, height: 19,
                            bgcolor: log.actor_role === 'system_admin' ? 'rgba(56,189,248,0.1)' : '#f1f5f9',
                            color:   log.actor_role === 'system_admin' ? BLUE : '#64748b',
                            border:  log.actor_role === 'system_admin' ? '1px solid rgba(56,189,248,0.25)' : '1px solid #e2e8f0',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action?.replace(/_/g, ' ')}
                          size="small"
                          color={ACTION_COLORS[log.action] || 'default'}
                          sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, height: 19 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.target || '—'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#64748b' }}>
                        {log.school || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: '#94a3b8' }}>
                        No records match your filters.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </SystemLayout>
  );
};

export default SystemLogsPage;