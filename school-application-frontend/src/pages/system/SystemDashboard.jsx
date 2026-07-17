import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, CircularProgress, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, IconButton, Divider,
} from '@mui/material';
import SendRoundedIcon       from '@mui/icons-material/SendRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import SystemLayout, { FONT, TEAL, BORDER, BG, SIDEBAR, CARD, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API = API_BASE;
const tok = () => sessionStorage.getItem('systemToken');
const auth = () => ({ Authorization: `Bearer ${tok()}` });
const authJson = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

const formatUptime = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const actionColor = (a) => {
  if (a?.includes('APPROVED') || a?.includes('LOGIN') || a?.includes('CREATE')) return 'success';
  if (a?.includes('REJECTED') || a?.includes('DELETE') || a?.includes('SUSPEND')) return 'error';
  if (a?.includes('RESET') || a?.includes('UPDATE')) return 'warning';
  return 'default';
};

// ── Arc gauge (SVG) ───────────────────────────────────────────────────────────
const ArcGauge = ({ value, max = 100, sublabel }) => {
  const r = 52, cx = 78, cy = 80;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;               // 270° gauge
  const pct  = Math.min(Math.max((value ?? 0) / max, 0), 1);
  const filled = pct * arc;
  const color = value === null ? INK_FAINT
    : value >= 75 ? '#10B981'
    : value >= 50 ? '#F59E0B'
    : '#EF4444';

  const zones = [
    { label: '0–49',  color: '#EF4444', pct: 0.49 },
    { label: '50–74', color: '#F59E0B', pct: 0.25 },
    { label: '75+',   color: '#10B981', pct: 0.26 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
      <Box sx={{ position: 'relative', width: 156, height: 120 }}>
        <svg width="156" height="120">
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={11} strokeLinecap="round"
            strokeDasharray={`${arc} ${circ - arc}`}
            transform={`rotate(135, ${cx}, ${cy})`}
          />
          {/* Value arc */}
          {filled > 0 && (
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={color} strokeWidth={11} strokeLinecap="round"
              strokeDasharray={`${filled} ${circ - filled}`}
              transform={`rotate(135, ${cx}, ${cy})`}
            />
          )}
          {/* Center value */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
            fontWeight="800" fontSize="22" fontFamily={FONT}>
            {value ?? '—'}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill={INK_FAINT} fontSize="10" fontFamily={FONT}>
            {sublabel}
          </text>
        </svg>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
        {zones.map(z => (
          <Box key={z.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: z.color }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>{z.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ── Health progress bar ───────────────────────────────────────────────────────
const HealthBar = ({ value }) => {
  const color = value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_SOFT }}>General Health Index</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', fontWeight: 700, color }}>
          {value !== null ? value : '—'}
        </Typography>
      </Box>
      <Box sx={{ height: 7, borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${value ?? 0}%`, bgcolor: color, borderRadius: '999px', transition: 'width 0.8s ease' }} />
      </Box>
    </Box>
  );
};

// ── Stat row for right panel ──────────────────────────────────────────────────
const StatRow = ({ label, value, color, dot }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.9, borderBottom: `1px solid ${BORDER}`, '&:last-child': { borderBottom: 'none' } }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {dot && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dot, flexShrink: 0 }} />}
      <Typography sx={{ fontFamily: FONT, fontSize: '0.74rem', color: INK_SOFT }}>{label}</Typography>
    </Box>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 700, color: color || INK }}>{value ?? '—'}</Typography>
  </Box>
);

// ── KPI tile ─────────────────────────────────────────────────────────────────
const KpiTile = ({ label, value, sub, accent }) => (
  <Box sx={{
    flex: '1 1 0', minWidth: 0,
    bgcolor: CARD, borderRadius: '8px',
    border: `1px solid ${BORDER}`,
    borderTop: `3px solid ${accent}`,
    px: 1.75, py: 1.5,
  }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.5 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.75rem', color: accent, lineHeight: 1 }}>
      {value ?? '—'}
    </Typography>
    {sub && <Typography sx={{ fontFamily: FONT, fontSize: '0.67rem', color: INK_FAINT, mt: 0.4 }}>{sub}</Typography>}
  </Box>
);

// ── AI chat panel ─────────────────────────────────────────────────────────────
const AiPanel = () => {
  const [msgs, setMsgs]     = useState([{ role: 'assistant', content: 'Hi! Ask me anything about your platform data, schools, or applications.' }]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const history = msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
    setMsgs(p => [...p, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/system/ai-chat`, { method: 'POST', headers: authJson(), body: JSON.stringify({ message: text, history }) });
      const data = await res.json();
      setMsgs(p => [...p, { role: 'assistant', content: data.reply || data.error || 'No response.' }]);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {msgs.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <Box sx={{
              maxWidth: '85%', px: 1.25, py: 0.75, borderRadius: '8px',
              bgcolor: m.role === 'user' ? TEAL : CARD,
              color: m.role === 'user' ? '#fff' : INK,
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.74rem', lineHeight: 1.5 }}>{m.content}</Typography>
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', gap: 0.5, px: 0.5 }}>
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TEAL, opacity: 0.6, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
            ))}
          </Box>
        )}
        <div ref={endRef} />
      </Box>
      {/* Input */}
      <Box sx={{ px: 1.25, py: 1, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 0.75 }}>
        <TextField
          size="small" fullWidth placeholder="Ask a question…" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          sx={{ '& .MuiOutlinedInput-root': { fontFamily: FONT, fontSize: '0.78rem', borderRadius: '6px' } }}
        />
        <IconButton size="small" onClick={send} disabled={loading || !input.trim()} sx={{ color: TEAL, bgcolor: `${TEAL}15`, borderRadius: '6px', px: 1 }}>
          <SendRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.4);opacity:1} }`}</style>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const SystemDashboard = () => {
  const navigate = useNavigate();
  const [data,     setData]     = useState(null);
  const [health,   setHealth]   = useState(null);
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [rightTab, setRightTab] = useState('stats'); // 'stats' | 'ai'

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/system/overview`,        { headers: auth() }).then(r => r.json()),
      fetch(`${API}/api/system/health`,          { headers: auth() }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/system/support-tickets`, { headers: auth() }).then(r => r.json()).catch(() => []),
    ])
      .then(([overview, h, t]) => { setData(overview); setHealth(h); setTickets(Array.isArray(t) ? t : []); })
      .finally(() => setLoading(false));
  }, []);

  const openTickets   = tickets.filter(t => t.status === 'open').length;
  const inProgress    = tickets.filter(t => t.status === 'in_progress').length;
  const activeSchools = data?.schools?.filter(s => s.is_active).length ?? 0;
  const dbOk          = health?.database?.connected;

  // Approval rate for gauge
  const approved = Number(data?.applications?.approved ?? 0);
  const rejected = Number(data?.applications?.rejected ?? 0);
  const decided  = approved + rejected;
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : null;

  // System health index (0–100)
  const healthIndex = health == null ? null
    : Math.round(
        (dbOk ? 45 : 0) +
        (health.errors24h === 0 ? 35 : Math.max(0, 35 - health.errors24h * 7)) +
        (health.database?.latencyMs < 80 ? 20 : health.database?.latencyMs < 300 ? 12 : 5)
      );

  // Chart data: per-school applications
  const chartData = (data?.schools ?? []).map(s => ({
    name: s.name?.split(' ')[0] ?? s.name,
    Pending:  Number(s.pending  ?? 0),
    Approved: Number(s.approved ?? 0),
    Total:    Number(s.applications ?? 0),
  }));

  return (
    <SystemLayout title="Overview" subtitle="Platform summary — all schools">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress sx={{ color: TEAL }} size={32} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

          {/* ── Center: main content ────────────────────────────── */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

            {/* KPI row */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <KpiTile label="Active Schools"     value={activeSchools}                           sub={`${data?.schools?.length ?? 0} registered`}         accent={TEAL} />
              <KpiTile label="Total Applications" value={data?.applications?.total}               sub={`${data?.applications?.today ?? 0} today`}          accent="#3B82F6" />
              <KpiTile label="Pending Review"     value={data?.applications?.pending}             sub="Awaiting decision"                                   accent="#F59E0B" />
              <KpiTile label="Open Tickets"       value={openTickets}                             sub={inProgress > 0 ? `${inProgress} in progress` : 'All clear'} accent={openTickets > 0 ? '#EF4444' : '#10B981'} />
            </Box>

            {/* Bar chart */}
            <Box sx={{ bgcolor: CARD, borderRadius: '8px', border: `1px solid ${BORDER}`, p: 2 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: INK, mb: 1.5 }}>
                Applications per School
              </Typography>
              {chartData.length === 0 ? (
                <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: INK_FAINT }}>No school data yet</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={28}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontFamily: FONT, fontSize: 11, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: FONT, fontSize: 11, fill: INK_SOFT }} axisLine={false} tickLine={false} width={28} />
                    <RTooltip
                      contentStyle={{ background: SIDEBAR, border: `1px solid ${BORDER}`, borderRadius: '8px', fontFamily: FONT, fontSize: '0.78rem', color: INK }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT }} />
                    <Bar dataKey="Total"   fill={`${TEAL}80`}   radius={[4,4,0,0]} name="Total" />
                    <Bar dataKey="Pending" fill="#F59E0B"        radius={[4,4,0,0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>

            {/* Schools table */}
            <Box sx={{ bgcolor: CARD, borderRadius: '8px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: INK }}>Schools</Typography>
                <Box component="span" onClick={() => navigate('/system/schools')}
                  sx={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600, color: TEAL, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                  Manage →
                </Box>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['School', 'Applications', 'Pending', 'Status'].map(h => (
                      <TableCell key={h} sx={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, px: 1.75 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.schools ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>No schools yet.</Typography>
                    </TableCell></TableRow>
                  )}
                  {(data?.schools ?? []).map(s => (
                    <TableRow key={s.id} hover onClick={() => navigate('/system/schools')}
                      sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.8rem', py: 1, px: 1.75 }}>{s.name}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.78rem', py: 1, px: 1.75 }}>{s.applications ?? 0}</TableCell>
                      <TableCell sx={{ py: 1, px: 1.75 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: s.pending > 0 ? '#F59E0B' : INK_FAINT }}>
                          {s.pending ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.75 }}>
                        <Chip label={s.is_active ? 'Active' : 'Inactive'} size="small" color={s.is_active ? 'success' : 'default'} sx={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, height: 18 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Recent activity */}
            <Box sx={{ bgcolor: CARD, borderRadius: '8px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: INK }}>Recent Activity</Typography>
              </Box>
              <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                {(!data?.recentActivity || data.recentActivity.length === 0) ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>No activity yet.</Typography>
                  </Box>
                ) : data.recentActivity.map(log => (
                  <Box key={log.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2, py: 1, borderBottom: `1px solid ${BORDER}`, '&:last-child': { borderBottom: 'none' } }}>
                    <Chip label={log.action?.replace(/_/g, ' ')} size="small" color={actionColor(log.action)}
                      sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, height: 18, flexShrink: 0, mt: 0.2 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.76rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.actor}{log.target ? ` → ${log.target}` : ''}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.67rem', color: INK_FAINT }}>
                        {log.school && `${log.school} · `}
                        {new Date(log.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

          </Box>

          {/* ── Right panel ─────────────────────────────────────── */}
          <Box sx={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${BORDER}`, bgcolor: SIDEBAR, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem', color: INK, letterSpacing: '0.04em' }}>SMS</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>
                  {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.67rem', color: INK_FAINT, mt: 0.2 }}>School Management System</Typography>
            </Box>

            {/* Tab toggle */}
            <Box sx={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
              {[['stats', 'Stats'], ['ai', 'AI Chat']].map(([id, label]) => (
                <Box key={id} onClick={() => setRightTab(id)}
                  sx={{
                    flex: 1, py: 0.9, textAlign: 'center', cursor: 'pointer',
                    borderBottom: rightTab === id ? `2px solid ${TEAL}` : '2px solid transparent',
                    bgcolor: rightTab === id ? `${TEAL}0D` : 'transparent',
                  }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: rightTab === id ? 700 : 500, color: rightTab === id ? TEAL : INK_SOFT }}>
                    {id === 'ai' && <AutoAwesomeRoundedIcon sx={{ fontSize: 11, mr: 0.4, verticalAlign: 'middle' }} />}
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {rightTab === 'ai' ? (
              <AiPanel />
            ) : (
              <Box sx={{ flex: 1, overflowY: 'auto' }}>

                {/* Platform health rows */}
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>
                    Platform
                  </Typography>
                  <StatRow label="Database"      value={health ? (dbOk ? `Connected · ${health.database.latencyMs}ms` : 'Unreachable') : 'Checking…'} dot={health ? (dbOk ? '#10B981' : '#EF4444') : INK_FAINT} />
                  <StatRow label="Uptime"        value={health ? formatUptime(health.server.uptimeSeconds) : '—'} />
                  <StatRow label="Memory"        value={health?.server?.memoryMb ? `${health.server.memoryMb} MB` : '—'} />
                  <StatRow label="Errors (24h)"  value={health?.errors24h ?? (health ? 0 : '—')} color={health?.errors24h > 0 ? '#F59E0B' : undefined} />
                </Box>

                <Divider sx={{ borderColor: BORDER, my: 1 }} />

                {/* App stats */}
                <Box sx={{ px: 2, pb: 0.5 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>
                    Applications
                  </Typography>
                  <StatRow label="Approved"  value={data?.applications?.approved ?? 0} dot="#10B981" />
                  <StatRow label="Pending"   value={data?.applications?.pending  ?? 0} dot="#F59E0B" />
                  <StatRow label="Rejected"  value={data?.applications?.rejected ?? 0} dot="#EF4444" />
                  <StatRow label="Today"     value={data?.applications?.today    ?? 0} />
                </Box>

                <Divider sx={{ borderColor: BORDER, my: 1 }} />

                {/* Tickets */}
                <Box sx={{ px: 2, pb: 0.5 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>
                    Support
                  </Typography>
                  <StatRow label="Open"        value={openTickets}       dot={openTickets > 0 ? '#EF4444' : '#10B981'} />
                  <StatRow label="In Progress" value={inProgress}        dot={inProgress  > 0 ? '#F59E0B' : undefined} />
                  <StatRow label="Total"       value={tickets.length} />
                </Box>

                <Divider sx={{ borderColor: BORDER, my: 1 }} />

                {/* Approval rate gauge */}
                <Box sx={{ px: 2 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.5 }}>
                    Approval Rate (AQI)
                  </Typography>
                  <ArcGauge value={approvalRate} max={100} sublabel="% of decided" />
                </Box>

                <Divider sx={{ borderColor: BORDER, my: 1 }} />

                {/* System health bar */}
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 1 }}>
                    System Health Index (SHI)
                  </Typography>
                  <HealthBar value={healthIndex} />
                </Box>

              </Box>
            )}
          </Box>

        </Box>
      )}
    </SystemLayout>
  );
};

export default SystemDashboard;
