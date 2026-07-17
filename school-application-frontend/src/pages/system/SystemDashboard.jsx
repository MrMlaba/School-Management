import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Tabs, Tab, TextField, CircularProgress,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, Cell,
  ResponsiveContainer,
} from 'recharts';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import SchoolRoundedIcon    from '@mui/icons-material/SchoolRounded';
import PeopleRoundedIcon    from '@mui/icons-material/PeopleRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import SystemLayout, { FONT, TEAL, BORDER, BG, SIDEBAR, CARD, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import API_BASE from '../../config';

const token = () => sessionStorage.getItem('systemToken');

// ── Arc gauge (270° sweep) ────────────────────────────────────────────────────
const ArcGauge = ({ pct = 0, label, size = 100 }) => {
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size * 0.58;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = pct * arc;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={BORDER} strokeWidth={7}
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={TEAL} strokeWidth={7}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.9s ease' }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill={INK} fontFamily={FONT} fontWeight={800} fontSize={size * 0.18}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.64rem', color: INK_FAINT, mt: -0.5 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
};

// ── Thin progress bar ─────────────────────────────────────────────────────────
const HealthBar = ({ value, label, color = TEAL }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.66rem', color: INK_SOFT }}>{label}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.66rem', color: INK, fontWeight: 700 }}>{value}%</Typography>
    </Box>
    <Box sx={{ height: 4, borderRadius: 99, bgcolor: BORDER, overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${value}%`, bgcolor: color, borderRadius: 99, transition: 'width 0.9s ease' }} />
    </Box>
  </Box>
);

// ── Stat row in right panel ───────────────────────────────────────────────────
const StatRow = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.55 }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_SOFT }}>{label}</Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 700, color: color || INK }}>{value}</Typography>
  </Box>
);

// ── AI chat panel ─────────────────────────────────────────────────────────────
const AiPanel = () => {
  const [history, setHistory] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    const next = [...history, { role: 'user', content: msg }];
    setHistory(next);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/system/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ message: msg, history: next }),
      });
      const d = await r.json();
      setHistory(h => [...h, { role: 'assistant', content: d.reply || d.error || 'No response.' }]);
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: 'Connection error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {history.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <SmartToyRoundedIcon sx={{ color: TEAL, fontSize: 28, mb: 0.5 }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT, lineHeight: 1.5 }}>
              Ask me about schools, admins, applications, or platform health.
            </Typography>
          </Box>
        )}
        {history.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <Box sx={{
              maxWidth: '85%', px: 1.5, py: 0.9,
              borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              bgcolor: m.role === 'user' ? `${TEAL}22` : CARD,
              border: `1px solid ${m.role === 'user' ? `${TEAL}40` : BORDER}`,
              animation: 'msgIn 0.2s ease',
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {m.content}
              </Typography>
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', px: 1 }}>
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: TEAL, animation: `dot 1.2s ease ${i * 0.2}s infinite` }} />
            ))}
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      <Box sx={{ borderTop: `1px solid ${BORDER}`, px: 1.25, py: 1, display: 'flex', gap: 0.75 }}>
        <TextField
          size="small" fullWidth placeholder="Ask the AI…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: FONT, fontSize: '0.73rem', borderRadius: '7px',
              '& fieldset': { borderColor: BORDER },
              '&:hover fieldset': { borderColor: `${TEAL}50` },
              '&.Mui-focused fieldset': { borderColor: TEAL },
            },
          }}
        />
        <Box onClick={send} sx={{
          width: 32, height: 32, borderRadius: '7px', bgcolor: TEAL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, mt: 0.05,
          '&:hover': { bgcolor: '#00B5A6' }, transition: 'background-color 0.15s',
        }}>
          <SendRoundedIcon sx={{ color: '#fff', fontSize: 15 }} />
        </Box>
      </Box>
    </Box>
  );
};

// ── Per-school card ───────────────────────────────────────────────────────────
const SchoolCard = ({ school, idx, onClick }) => {
  const total    = school.total_applications   || 0;
  const pending  = school.pending_applications || 0;
  const approved = school.approved_count       || 0;
  const rate     = total > 0 ? Math.round((approved / total) * 100) : 0;

  const bars = [
    { name: 'Total', v: total,    color: TEAL },
    { name: 'Pend',  v: pending,  color: '#F59E0B' },
    { name: 'Appr',  v: approved, color: '#10B981' },
  ];

  return (
    <Box
      onClick={() => onClick(school)}
      sx={{
        bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`,
        overflow: 'hidden', cursor: 'pointer',
        '&:hover': { borderColor: `${TEAL}50`, transform: 'translateY(-3px)', boxShadow: `0 10px 30px rgba(0,0,0,0.35)` },
        transition: 'all 0.22s ease',
        animation: `cardIn 0.4s ease ${idx * 0.08}s both`,
      }}
    >
      {/* Header */}
      <Box sx={{ px: 1.75, pt: 1.5, pb: 1, borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: INK }}>
            {school.name}
          </Typography>
          <Typography noWrap sx={{ fontFamily: FONT, fontSize: '0.63rem', color: INK_FAINT }}>
            {school.location || 'No location set'}
          </Typography>
        </Box>
        <Chip
          label={school.is_active ? 'Active' : 'Inactive'}
          size="small"
          sx={{
            fontFamily: FONT, fontWeight: 700, fontSize: '0.58rem', height: 18, borderRadius: '4px', flexShrink: 0,
            bgcolor: school.is_active ? '#10B98122' : '#EF444422',
            color: school.is_active ? '#10B981' : '#EF4444',
          }}
        />
      </Box>

      {/* Mini KPI row */}
      <Box sx={{ display: 'flex', px: 1.75, pt: 1.1, pb: 0.5, gap: 2.5 }}>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: TEAL, lineHeight: 1 }}>{total}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>Applications</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: '#F59E0B', lineHeight: 1 }}>{pending}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>Pending</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: '#10B981', lineHeight: 1 }}>{rate}%</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>Approval</Typography>
        </Box>
      </Box>

      {/* Mini inline bar chart */}
      <Box sx={{ px: 0.75, pb: 1.25 }}>
        <ResponsiveContainer width="100%" height={46}>
          <BarChart data={bars} barSize={14} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Bar dataKey="v" radius={[3, 3, 0, 0]}>
              {bars.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

// ── Empty center state ────────────────────────────────────────────────────────
const EmptyState = () => (
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, animation: 'cardIn 0.4s ease' }}>
    <Box sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: `${TEAL}14`, border: `2px dashed ${TEAL}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SchoolRoundedIcon sx={{ color: TEAL, fontSize: 28 }} />
    </Box>
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: INK }}>No schools yet</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_FAINT, mt: 0.3 }}>
        Create a school to start seeing per-school analytics here.
      </Typography>
    </Box>
  </Box>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const SystemDashboard = () => {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token()}` };
    const [sResult, schResult] = await Promise.allSettled([
      fetch(`${API_BASE}/api/system/stats`,   { headers }).then(r => r.json()),
      fetch(`${API_BASE}/api/system/schools`, { headers }).then(r => r.json()),
    ]);
    if (sResult.status === 'fulfilled')   setStats(sResult.value);
    if (schResult.status === 'fulfilled') setSchools(Array.isArray(schResult.value) ? schResult.value : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const s    = stats || {};
  const apps = s.applications || {};
  const tot  = apps.total    || 0;
  const pend = apps.pending  || 0;
  const appr = apps.approved || 0;
  const rej  = apps.rejected || 0;
  const dec  = appr + rej;
  const appRate = dec > 0 ? Math.round((appr / dec) * 100) : 0;

  const dbOk     = s.database?.connected === true;
  const errCount = s.system?.error_count_last_hour || 0;
  const latency  = s.system?.avg_response_ms || 0;
  const sysHealth = Math.max(0, Math.round(
    (dbOk ? 40 : 0) + Math.max(0, 30 - errCount * 3) + Math.max(0, 30 - latency / 10)
  ));

  const KPI_ITEMS = [
    { Icon: SchoolRoundedIcon,      label: 'Schools',      value: s.schools?.active ?? '—', color: TEAL,      sub: `${s.schools?.total ?? 0} total` },
    { Icon: AssignmentRoundedIcon,  label: 'Applications', value: tot,                      color: '#3B82F6', sub: `${pend} pending` },
    { Icon: CheckCircleRoundedIcon, label: 'Approved',     value: appr,                     color: '#10B981', sub: `${appRate}% rate` },
    { Icon: PeopleRoundedIcon,      label: 'Admins',       value: s.admins?.total ?? '—',   color: '#8B5CF6', sub: `${s.admins?.active ?? 0} active` },
    { Icon: TrendingUpRoundedIcon,  label: 'Sys Health',   value: `${sysHealth}%`,           color: sysHealth > 70 ? '#10B981' : sysHealth > 40 ? '#F59E0B' : '#EF4444', sub: dbOk ? 'DB connected' : 'DB error' },
  ];

  return (
    <SystemLayout title="Overview" subtitle="System Dashboard">
      <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── Center: KPI strip + school cards ────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* KPI strip */}
          <Box sx={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {KPI_ITEMS.map(({ Icon, label, value, color, sub }, i) => (
              <Box key={i} sx={{
                flex: 1, px: 2, py: 1.25,
                borderRight: `1px solid ${BORDER}`,
                '&:last-child': { borderRight: 'none' },
                display: 'flex', alignItems: 'center', gap: 1.25,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                transition: 'background-color 0.15s',
                animation: `kpiIn 0.35s ease ${i * 0.07}s both`,
              }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ color, fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem', color, lineHeight: 1.1 }}>{value}</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.63rem', color: INK_SOFT }}>{label}</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', color: INK_FAINT }}>{sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* School cards grid */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress size={28} sx={{ color: TEAL }} />
              </Box>
            ) : schools.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 1.5 }}>
                  Schools — {schools.length} registered
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.5 }}>
                  {schools.map((school, idx) => (
                    <SchoolCard
                      key={school.id}
                      school={school}
                      idx={idx}
                      onClick={() => navigate('/system/schools')}
                    />
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Right panel: Stats + AI ──────────────────────── */}
        <Box sx={{
          width: 268, flexShrink: 0,
          bgcolor: SIDEBAR, borderLeft: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Panel header + tabs */}
          <Box sx={{ px: 2, pt: 1.5, pb: 0, flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '0.78rem', color: INK }}>SMS</Typography>
              <Chip label="Live" size="small" sx={{ fontFamily: FONT, fontSize: '0.58rem', height: 17, bgcolor: `${TEAL}18`, color: TEAL, fontWeight: 700 }} />
            </Box>
            <Tabs
              value={tab} onChange={(_, v) => setTab(v)}
              sx={{
                minHeight: 30,
                '& .MuiTab-root': { fontFamily: FONT, fontSize: '0.7rem', minHeight: 30, py: 0, textTransform: 'none', color: INK_FAINT, fontWeight: 600 },
                '& .Mui-selected': { color: TEAL },
                '& .MuiTabs-indicator': { bgcolor: TEAL, height: 2 },
              }}
            >
              <Tab label="Stats" />
              <Tab label="AI Chat" />
            </Tabs>
          </Box>

          {/* Stats tab */}
          {tab === 0 && (
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ArcGauge pct={appRate / 100} label="Approval Rate" size={108} />
              </Box>

              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Platform Health</Typography>
                <HealthBar value={sysHealth} label="Overall Score" color={sysHealth > 70 ? '#10B981' : sysHealth > 40 ? '#F59E0B' : '#EF4444'} />
                <Box sx={{ mt: 1 }}>
                  <HealthBar value={dbOk ? 100 : 0} label="Database" color={dbOk ? '#10B981' : '#EF4444'} />
                </Box>
              </Box>

              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Schools</Typography>
                <StatRow label="Total"    value={s.schools?.total  ?? '—'} />
                <StatRow label="Active"   value={s.schools?.active ?? '—'} color={TEAL} />
                <StatRow label="Inactive" value={(s.schools?.total || 0) - (s.schools?.active || 0)} />
              </Box>

              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Applications</Typography>
                <StatRow label="Total"    value={tot}  />
                <StatRow label="Pending"  value={pend} color="#F59E0B" />
                <StatRow label="Approved" value={appr} color="#10B981" />
                <StatRow label="Rejected" value={rej}  color="#EF4444" />
              </Box>

              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>System</Typography>
                <StatRow label="DB Status"   value={dbOk ? 'Connected' : 'Error'} color={dbOk ? '#10B981' : '#EF4444'} />
                <StatRow label="Avg Latency" value={`${latency}ms`} />
                <StatRow label="Errors/hr"   value={errCount} color={errCount > 5 ? '#EF4444' : errCount > 0 ? '#F59E0B' : '#10B981'} />
              </Box>
            </Box>
          )}

          {/* AI tab */}
          {tab === 1 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <AiPanel />
            </Box>
          )}
        </Box>
      </Box>

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kpiIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </SystemLayout>
  );
};

export default SystemDashboard;
