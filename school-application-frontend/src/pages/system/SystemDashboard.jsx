import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip, Stack,
} from '@mui/material';
import DescriptionOutlinedIcon  from '@mui/icons-material/DescriptionOutlined';
import AccessTimeIcon           from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon   from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon       from '@mui/icons-material/CancelOutlined';
import SchoolOutlinedIcon       from '@mui/icons-material/SchoolOutlined';
import TodayIcon                from '@mui/icons-material/Today';
import StorageOutlinedIcon      from '@mui/icons-material/StorageOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { useNavigate } from 'react-router-dom';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

// ── Stat card ─────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, bg }) => (
  <Card elevation={0} sx={{
    border: '1px solid #e2e8f0', borderRadius: '10px',
    bgcolor: '#fff', height: '100%',
  }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{
          width: 42, height: 42, borderRadius: '9px',
          bgcolor: bg, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.8rem', color: '#0f172a', lineHeight: 1.1 }}>
            {value ?? '—'}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

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
        <Box sx={{ p: 2, bgcolor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
          <Typography sx={{ fontFamily: FONT, color: '#dc2626', fontSize: '0.875rem' }}>{error}</Typography>
        </Box>
      )}

      {data && (
        <>
          {/* ── Stat cards ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { icon: <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />, label: 'Total Applications', value: data.applications?.total,    color: '#0369a1', bg: '#e0f2fe' },
              { icon: <AccessTimeIcon sx={{ fontSize: 20 }} />,          label: 'Pending Review',     value: data.applications?.pending,  color: '#b45309', bg: '#fef3c7' },
              { icon: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />,  label: 'Approved',           value: data.applications?.approved, color: '#15803d', bg: '#dcfce7' },
              { icon: <CancelOutlinedIcon sx={{ fontSize: 20 }} />,      label: 'Rejected',           value: data.applications?.rejected, color: '#b91c1c', bg: '#fee2e2' },
              { icon: <TodayIcon sx={{ fontSize: 20 }} />,               label: 'Submitted Today',    value: data.applications?.today,    color: '#7c3aed', bg: '#ede9fe' },
              { icon: <SchoolOutlinedIcon sx={{ fontSize: 20 }} />,      label: 'Active Schools',     value: data.schools?.filter(s => s.is_active).length, color: '#0f172a', bg: '#f1f5f9' },
            ].map((s) => (
              <Grid item xs={6} sm={4} md={2} key={s.label}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>

          {/* ── Platform health + support tickets ── */}
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px', bgcolor: '#fff', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <StorageOutlinedIcon sx={{ fontSize: 18, color: INK_SOFT }} />
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: INK }}>
                      Platform Health
                    </Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>Database</Typography>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: health?.database?.connected ? core.accent : core.danger }}>
                        {health ? (health.database.connected ? `Connected · ${health.database.latencyMs}ms` : 'Unreachable') : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>Backend Uptime</Typography>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: INK }}>
                        {health ? formatUptime(health.server.uptimeSeconds) : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>Errors (24h)</Typography>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: health?.errors24h ? core.warn : INK }}>
                        {health?.errors24h ?? (health ? 0 : '—')}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px', bgcolor: '#fff', height: '100%', cursor: 'pointer' }} onClick={() => navigate('/system/tickets')}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <ConfirmationNumberOutlinedIcon sx={{ fontSize: 18, color: INK_SOFT }} />
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: INK }}>
                      Support Tickets
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.6rem', color: core.warn, lineHeight: 1 }}>{openTickets}</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mt: 0.5 }}>Open</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.6rem', color: core.link, lineHeight: 1 }}>{inProgressTickets}</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mt: 0.5 }}>In Progress</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.6rem', color: INK, lineHeight: 1 }}>{tickets.length}</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mt: 0.5 }}>Total</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            {/* ── Per-school breakdown ── */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: '#fff' }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Applications per School
                    </Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['School', 'Total', 'Pending', 'Status'].map(h => (
                            <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem', color: '#94a3b8', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.schools?.map((s) => (
                          <TableRow key={s.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#1e293b', fontWeight: 500 }}>{s.name}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#475569' }}>{s.applications}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#475569' }}>{s.pending}</TableCell>
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
                </CardContent>
              </Card>
            </Grid>

            {/* ── Recent activity ── */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: '#fff' }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Recent Activity
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                    {data.recentActivity?.length === 0 && (
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#94a3b8' }}>No activity yet</Typography>
                      </Box>
                    )}
                    {data.recentActivity?.map((log) => (
                      <Box key={log.id} sx={{
                        px: 2.5, py: 1.5,
                        borderBottom: '1px solid #f8fafc',
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
                          <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: '#94a3b8' }}>
                            {log.school} · {new Date(log.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </SystemLayout>
  );
};

export default SystemDashboard;