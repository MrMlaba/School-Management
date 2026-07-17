import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
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

// ── KPI tile ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, accent }) => (
  <Box sx={{
    flex: '1 1 0', minWidth: 0,
    bgcolor: '#fff',
    border: `1px solid ${BORDER}`,
    borderTop: `3px solid ${accent}`,
    borderRadius: '6px',
    px: 2, py: 1.75,
  }}>
    <Typography sx={{
      fontFamily: FONT, fontSize: '0.63rem', fontWeight: 700,
      color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.6,
    }}>
      {label}
    </Typography>
    <Typography sx={{
      fontFamily: FONT, fontWeight: 800, fontSize: '1.75rem',
      color: accent, lineHeight: 1,
    }}>
      {value ?? '—'}
    </Typography>
    {sub && (
      <Typography sx={{ fontFamily: FONT, fontSize: '0.69rem', color: INK_FAINT, mt: 0.5 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

// ── Section heading ───────────────────────────────────────────────────────────
const SectionHead = ({ children, action }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    px: 2, py: 1.25,
    borderBottom: `1px solid ${BORDER}`,
  }}>
    <Typography sx={{
      fontFamily: FONT, fontWeight: 700, fontSize: '0.72rem',
      color: INK, textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      {children}
    </Typography>
    {action}
  </Box>
);

// ── White card wrapper ────────────────────────────────────────────────────────
const Card = ({ children, sx }) => (
  <Box sx={{
    bgcolor: '#fff', border: `1px solid ${BORDER}`,
    borderRadius: '8px', overflow: 'hidden', ...sx,
  }}>
    {children}
  </Box>
);

// ── Inline status row (health / tickets) ─────────────────────────────────────
const StatusRow = ({ label, value, dot }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    px: 2, py: 1.1,
    borderBottom: `1px solid ${BORDER}`,
    '&:last-child': { borderBottom: 'none' },
  }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: INK_SOFT }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {dot && (
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%', bgcolor: dot, flexShrink: 0,
          boxShadow: `0 0 0 3px ${dot}22`,
        }} />
      )}
      <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: INK }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
const SystemDashboard = () => {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [health,  setHealth]  = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/system/overview`,        { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/system/health`,          { headers: authHeaders() }).then(r => r.json()).catch(() => null),
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

  const openTickets       = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const activeSchools     = data?.schools?.filter(s => s.is_active).length ?? 0;
  const dbOk              = health?.database?.connected;

  return (
    <SystemLayout title="Overview" subtitle="Platform summary across all schools">

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: BLUE }} size={28} />
        </Box>
      )}

      {error && (
        <Box sx={{ p: 2, mb: 2, bgcolor: core.dangerBg, border: `1px solid ${core.danger}44`, borderRadius: '6px' }}>
          <Typography sx={{ fontFamily: FONT, color: core.danger, fontSize: '0.82rem' }}>{error}</Typography>
        </Box>
      )}

      {data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* ── KPI row ── */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <KpiCard
              label="Total Applications"
              value={data.applications?.total}
              sub={`${data.applications?.today ?? 0} submitted today`}
              accent={BLUE}
            />
            <KpiCard
              label="Active Schools"
              value={activeSchools}
              sub={`${data.schools?.length ?? 0} registered`}
              accent={core.accent}
            />
            <KpiCard
              label="Pending Review"
              value={data.applications?.pending}
              sub="Awaiting decision"
              accent={data.applications?.pending > 0 ? core.warn : INK_FAINT}
            />
            <KpiCard
              label="Open Tickets"
              value={openTickets}
              sub={inProgressTickets > 0 ? `${inProgressTickets} in progress` : 'No active issues'}
              accent={openTickets > 0 ? core.danger : core.accent}
            />
          </Box>

          {/* ── Two-column body ── */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

            {/* Left — applications per school table */}
            <Card sx={{ flex: '1 1 0', minWidth: 0 }}>
              <SectionHead>Applications per School</SectionHead>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['School', 'Total', 'Pending', 'Status'].map(h => (
                      <TableCell key={h} sx={{
                        fontFamily: FONT, fontWeight: 700, fontSize: '0.65rem',
                        color: INK_FAINT, bgcolor: '#F8FAFC',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        borderBottom: `1px solid ${BORDER}`, py: 1, px: 1.5,
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.schools?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>
                          No schools registered yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {data.schools?.map((s) => (
                    <TableRow
                      key={s.id}
                      hover
                      onClick={() => navigate('/system/schools')}
                      sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                    >
                      <TableCell sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.80rem', color: INK, py: 1.1, px: 1.5 }}>
                        {s.name}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.80rem', color: INK, fontWeight: 500, py: 1.1, px: 1.5 }}>
                        {s.applications ?? 0}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, px: 1.5 }}>
                        <Typography sx={{
                          fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600,
                          color: s.pending > 0 ? core.warn : INK_FAINT,
                        }}>
                          {s.pending ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.1, px: 1.5 }}>
                        <Chip
                          label={s.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={s.is_active ? 'success' : 'default'}
                          sx={{ fontFamily: FONT, fontSize: '0.63rem', fontWeight: 700, height: 18 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Right — health + tickets stacked */}
            <Box sx={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

              <Card>
                <SectionHead>Platform Health</SectionHead>
                <StatusRow
                  label="Database"
                  value={health ? (dbOk ? `Connected · ${health.database.latencyMs}ms` : 'Unreachable') : 'Checking…'}
                  dot={health ? (dbOk ? core.accent : core.danger) : INK_FAINT}
                />
                <StatusRow
                  label="Backend Uptime"
                  value={health ? formatUptime(health.server.uptimeSeconds) : '—'}
                />
                <StatusRow
                  label="Errors (24 h)"
                  value={health?.errors24h ?? (health ? '0' : '—')}
                  dot={health?.errors24h > 0 ? core.warn : undefined}
                />
                <StatusRow
                  label="Memory"
                  value={health?.server?.memoryMb ? `${health.server.memoryMb} MB` : '—'}
                />
              </Card>

              <Card>
                <SectionHead
                  action={
                    <Typography
                      onClick={() => navigate('/system/tickets')}
                      sx={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600, color: BLUE, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    >
                      View all →
                    </Typography>
                  }
                >
                  Support Tickets
                </SectionHead>
                <StatusRow
                  label="Open"
                  value={openTickets}
                  dot={openTickets > 0 ? core.danger : core.accent}
                />
                <StatusRow
                  label="In Progress"
                  value={inProgressTickets}
                  dot={inProgressTickets > 0 ? core.warn : undefined}
                />
                <StatusRow label="Total" value={tickets.length} />
              </Card>

              {/* Application breakdown */}
              <Card>
                <SectionHead>Applications</SectionHead>
                <StatusRow label="Approved"  value={data.applications?.approved ?? 0}  dot={core.accent} />
                <StatusRow label="Rejected"  value={data.applications?.rejected ?? 0}  dot={data.applications?.rejected > 0 ? core.danger : undefined} />
                <StatusRow label="Pending"   value={data.applications?.pending ?? 0}   dot={data.applications?.pending  > 0 ? core.warn  : undefined} />
                <StatusRow label="Today"     value={data.applications?.today ?? 0} />
              </Card>

            </Box>
          </Box>

          {/* ── Recent activity ── */}
          <Card>
            <SectionHead>Recent Activity</SectionHead>
            {(!data.recentActivity || data.recentActivity.length === 0) ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.80rem', color: INK_FAINT }}>
                  No activity recorded yet.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {data.recentActivity.map((log) => (
                  <Box
                    key={log.id}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1.5,
                      px: 2, py: 1.1,
                      borderBottom: `1px solid ${BORDER}`,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Chip
                      label={log.action?.replace(/_/g, ' ')}
                      size="small"
                      color={actionColor(log.action)}
                      sx={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, height: 19, flexShrink: 0, mt: 0.2 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontFamily: FONT, fontSize: '0.78rem', color: INK, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {log.actor}{log.target ? ` → ${log.target}` : ''}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>
                        {log.school && `${log.school} · `}
                        {new Date(log.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Card>

        </Box>
      )}
    </SystemLayout>
  );
};

export default SystemDashboard;
