import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import LedgerSheet from '../../components/system/LedgerSheet';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

const formatUptime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
};

const actionColor = (action) => {
  if (action?.includes('APPROVED') || action?.includes('LOGIN') || action?.includes('CREATE')) return 'success';
  if (action?.includes('REJECTED') || action?.includes('DELETE') || action?.includes('SUSPEND')) return 'error';
  if (action?.includes('RESET') || action?.includes('UPDATE')) return 'warning';
  return 'default';
};

// ── A label/value pair, used instead of icon stat cards ──
const Stat = ({ label, value, color }) => (
  <Box>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.4 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.5rem', color: color || INK, lineHeight: 1 }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

const SystemDashboard = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [health, setHealth]   = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/system/overview`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/system/health`,   { headers: authHeaders() }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/system/support-tickets`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ])
      .then(([overview, healthData, ticketData]) => {
        setData(overview);
        setHealth(healthData);
        setTickets(Array.isArray(ticketData) ? ticketData : []);
      })
      .catch(() => setError('Failed to load overview data.'))
      .finally(() => setLoading(false));
  }, []);

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <SystemLayout title="Overview" subtitle="Platform summary across all schools">
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BLUE }} size={30} />
        </Box>
      )}
      {error && (
        <Box sx={{ p: 2, bgcolor: core.dangerBg, border: `1px solid ${core.danger}33`, borderRadius: '4px' }}>
          <Typography sx={{ fontFamily: FONT, color: core.danger, fontSize: '0.875rem' }}>{error}</Typography>
        </Box>
      )}

      {data && (
        <>
          <LedgerSheet title="Applications" meta={`${data.schools?.length ?? 0} schools`}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Stat label="Total"          value={data.applications?.total} />
              <Stat label="Pending Review" value={data.applications?.pending} color={core.warn} />
              <Stat label="Approved"       value={data.applications?.approved} color={core.accent} />
              <Stat label="Rejected"       value={data.applications?.rejected} color={core.danger} />
              <Stat label="Submitted Today" value={data.applications?.today} />
              <Stat label="Active Schools" value={data.schools?.filter(s => s.is_active).length} />
            </Box>
          </LedgerSheet>

          <LedgerSheet title="Platform Health">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Stat
                label="Database"
                value={health ? (health.database.connected ? `Connected · ${health.database.latencyMs}ms` : 'Unreachable') : '—'}
                color={health?.database?.connected ? core.accent : core.danger}
              />
              <Stat label="Backend Uptime" value={health ? formatUptime(health.server.uptimeSeconds) : '—'} />
              <Stat
                label="Errors (24h)"
                value={health?.errors24h ?? (health ? 0 : '—')}
                color={health?.errors24h ? core.warn : INK}
              />
            </Box>
          </LedgerSheet>

          <LedgerSheet
            title="Support Tickets"
            meta={<Box component="span" onClick={() => navigate('/system/tickets')} sx={{ cursor: 'pointer', color: core.link, fontWeight: 600 }}>View queue →</Box>}
          >
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Stat label="Open" value={openTickets} color={core.warn} />
              <Stat label="In Progress" value={inProgressTickets} color={core.link} />
              <Stat label="Total" value={tickets.length} />
            </Box>
          </LedgerSheet>

          <LedgerSheet title="Applications per School">
            <TableContainer sx={{ maxHeight: 340 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['School', 'Total', 'Pending', 'Status'].map(h => (
                      <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.schools?.map((s) => (
                    <TableRow key={s.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK, fontWeight: 500 }}>{s.name}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_SOFT }}>{s.applications}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_SOFT }}>{s.pending}</TableCell>
                      <TableCell>
                        <Chip
                          label={s.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={s.is_active ? 'success' : 'default'}
                          sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, height: 20 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </LedgerSheet>

          <LedgerSheet title="Recent Activity">
            <Box sx={{ maxHeight: 340, overflow: 'auto' }}>
              {data.recentActivity?.length === 0 && (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT }}>No activity yet</Typography>
                </Box>
              )}
              {data.recentActivity?.map((log) => (
                <Box key={log.id} sx={{
                  py: 1.25, borderBottom: `1px solid #F1F5F9`,
                  display: 'flex', alignItems: 'flex-start', gap: 1.5,
                  '&:last-child': { borderBottom: 'none' },
                }}>
                  <Chip
                    label={log.action?.replace(/_/g, ' ')}
                    size="small"
                    color={actionColor(log.action)}
                    sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, height: 20, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.actor} {log.target ? `→ ${log.target}` : ''}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>
                      {log.school} · {new Date(log.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </LedgerSheet>
        </>
      )}
    </SystemLayout>
  );
};

export default SystemDashboard;
