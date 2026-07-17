import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, Tabs, Tab, TextField, CircularProgress } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import SendRoundedIcon          from '@mui/icons-material/SendRounded';
import SmartToyRoundedIcon      from '@mui/icons-material/SmartToyRounded';
import SchoolRoundedIcon        from '@mui/icons-material/SchoolRounded';
import PeopleRoundedIcon        from '@mui/icons-material/PeopleRounded';
import AssignmentRoundedIcon    from '@mui/icons-material/AssignmentRounded';
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded';
import TrendingUpRoundedIcon    from '@mui/icons-material/TrendingUpRounded';
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded';
import MenuBookRoundedIcon      from '@mui/icons-material/MenuBookRounded';
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded';
import SystemLayout, { FONT, TEAL, BORDER, BG, SIDEBAR, CARD, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import API_BASE from '../../config';

const token = () => sessionStorage.getItem('systemToken');

const DARK_TT = {
  contentStyle: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: FONT, fontSize: '0.72rem' },
  labelStyle: { color: INK_SOFT, fontFamily: FONT },
  itemStyle: { color: INK },
};

// ── Arc gauge ─────────────────────────────────────────────────────────────────
const ArcGauge = ({ pct = 0, label, size = 100, color = TEAL }) => {
  const r = size * 0.42, cx = size / 2, cy = size * 0.58;
  const circ = 2 * Math.PI * r, arc = circ * 0.75, filled = Math.min(pct, 1) * arc;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={BORDER} strokeWidth={7}
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.9s ease' }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill={INK} fontFamily={FONT} fontWeight={800} fontSize={size * 0.18}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <Typography sx={{ fontFamily: FONT, fontSize: '0.64rem', color: INK_FAINT, mt: -0.5 }}>{label}</Typography>}
    </Box>
  );
};

const HealthBar = ({ value, label, color = TEAL }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.66rem', color: INK_SOFT }}>{label}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.66rem', color: INK, fontWeight: 700 }}>{value}%</Typography>
    </Box>
    <Box sx={{ height: 4, borderRadius: 99, bgcolor: BORDER, overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${Math.min(value, 100)}%`, bgcolor: color, borderRadius: 99, transition: 'width 0.9s ease' }} />
    </Box>
  </Box>
);

const StatRow = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.55 }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_SOFT }}>{label}</Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 700, color: color || INK }}>{value}</Typography>
  </Box>
);

// ── AI panel ──────────────────────────────────────────────────────────────────
const AiPanel = () => {
  const [history, setHistory] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    const next = [...history, { role: 'user', content: msg }];
    setHistory(next); setInput(''); setLoading(true);
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
    } finally { setLoading(false); }
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
            {[0, 1, 2].map(i => <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: TEAL, animation: `dot 1.2s ease ${i * 0.2}s infinite` }} />)}
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>
      <Box sx={{ borderTop: `1px solid ${BORDER}`, px: 1.25, py: 1, display: 'flex', gap: 0.75 }}>
        <TextField
          size="small" fullWidth placeholder="Ask the AI…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          sx={{ '& .MuiOutlinedInput-root': { fontFamily: FONT, fontSize: '0.73rem', borderRadius: '7px', '& fieldset': { borderColor: BORDER }, '&:hover fieldset': { borderColor: `${TEAL}50` }, '&.Mui-focused fieldset': { borderColor: TEAL } } }}
        />
        <Box onClick={send} sx={{ width: 32, height: 32, borderRadius: '7px', bgcolor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, mt: 0.05, '&:hover': { bgcolor: '#00B5A6' }, transition: 'background-color 0.15s' }}>
          <SendRoundedIcon sx={{ color: '#fff', fontSize: 15 }} />
        </Box>
      </Box>
    </Box>
  );
};

// ── Per-school card (All Schools view) ───────────────────────────────────────
const SchoolCard = ({ school, idx, onClick }) => {
  const total    = school.total_applications   || 0;
  const pending  = school.pending_applications || 0;
  const approved = school.approved_count       || 0;
  const rate     = total > 0 ? Math.round((approved / total) * 100) : 0;
  const bars     = [{ name: 'Total', v: total, color: TEAL }, { name: 'Pend', v: pending, color: '#F59E0B' }, { name: 'Appr', v: approved, color: '#10B981' }];
  return (
    <Box onClick={() => onClick(school)} sx={{ bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`, overflow: 'hidden', cursor: 'pointer', '&:hover': { borderColor: `${TEAL}50`, transform: 'translateY(-3px)', boxShadow: `0 10px 30px rgba(0,0,0,0.35)` }, transition: 'all 0.22s ease', animation: `cardIn 0.4s ease ${idx * 0.08}s both` }}>
      <Box sx={{ px: 1.75, pt: 1.5, pb: 1, borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: INK }}>{school.name}</Typography>
          <Typography noWrap sx={{ fontFamily: FONT, fontSize: '0.63rem', color: INK_FAINT }}>{school.location || 'No location set'}</Typography>
        </Box>
        <Chip label={school.is_active ? 'Active' : 'Inactive'} size="small" sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.58rem', height: 18, borderRadius: '4px', flexShrink: 0, bgcolor: school.is_active ? '#10B98122' : '#EF444422', color: school.is_active ? '#10B981' : '#EF4444' }} />
      </Box>
      <Box sx={{ display: 'flex', px: 1.75, pt: 1.1, pb: 0.5, gap: 2.5 }}>
        {[['Applications', total, TEAL], ['Pending', pending, '#F59E0B'], ['Approval', `${rate}%`, '#10B981']].map(([l, v, c]) => (
          <Box key={l}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: c, lineHeight: 1 }}>{v}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>{l}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: 0.75, pb: 1.25 }}>
        <ResponsiveContainer width="100%" height={46}>
          <BarChart data={bars} barSize={14} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Bar dataKey="v" radius={[3, 3, 0, 0]}>{bars.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.8} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

// ── Right-panel: stats + AI ───────────────────────────────────────────────────
const RightPanel = ({ stats, report, viewingSchool }) => {
  const [tab, setTab] = useState(0);
  const s    = stats || {};
  const apps = s.applications || {};
  const tot  = apps.total || 0, appr = apps.approved || 0, rej = apps.rejected || 0;
  const dec  = appr + rej;
  const appRate = dec > 0 ? Math.round((appr / dec) * 100) : 0;
  const dbOk = s.database?.connected === true;
  const sysHealth = Math.max(0, Math.round((dbOk ? 40 : 0) + 30 + 30));

  return (
    <Box sx={{ width: 268, flexShrink: 0, bgcolor: SIDEBAR, borderLeft: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 0, flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '0.78rem', color: INK }}>SMS</Typography>
          <Chip label="Live" size="small" sx={{ fontFamily: FONT, fontSize: '0.58rem', height: 17, bgcolor: `${TEAL}18`, color: TEAL, fontWeight: 700 }} />
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 30, '& .MuiTab-root': { fontFamily: FONT, fontSize: '0.7rem', minHeight: 30, py: 0, textTransform: 'none', color: INK_FAINT, fontWeight: 600 }, '& .Mui-selected': { color: TEAL }, '& .MuiTabs-indicator': { bgcolor: TEAL, height: 2 } }}>
          <Tab label="Stats" />
          <Tab label="AI Chat" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {viewingSchool && report ? (
            // Per-school right panel
            <>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                <ArcGauge pct={(report.attendance?.attendance_rate || 0) / 100} label="Attendance" size={108} color={TEAL} />
                <ArcGauge pct={(report.performance?.pass_rate || 0) / 100} label="Pass Rate" size={108} color="#10B981" />
              </Box>
              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Enrollment</Typography>
                <StatRow label="Total Students" value={report.staff?.students?.total ?? 0} />
                <StatRow label="Active"         value={report.staff?.students?.active ?? 0} color={TEAL} />
                <StatRow label="Teachers"       value={report.staff?.teachers?.total ?? 0} />
                <StatRow label="Parents"        value={report.staff?.parents?.total ?? 0} />
                <StatRow label="Subjects"       value={report.subjects ?? 0} />
              </Box>
              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Applications</Typography>
                <StatRow label="Total"    value={report.applications?.total ?? 0} />
                <StatRow label="Approved" value={report.applications?.approved ?? 0} color="#10B981" />
                <StatRow label="Pending"  value={report.applications?.pending ?? 0} color="#F59E0B" />
                <StatRow label="Rejected" value={report.applications?.rejected ?? 0} color="#EF4444" />
              </Box>
              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Platform Logins (7d)</Typography>
                <StatRow label="Admins"   value={report.staff?.admins?.logged_in_7d   ?? 0} color={TEAL} />
                <StatRow label="Teachers" value={report.staff?.teachers?.logged_in_7d ?? 0} color="#8B5CF6" />
                <StatRow label="Students" value={report.staff?.students?.logged_in_7d ?? 0} color="#3B82F6" />
              </Box>
            </>
          ) : (
            // All-schools right panel
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ArcGauge pct={appRate / 100} label="Approval Rate" size={108} />
              </Box>
              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Platform Health</Typography>
                <HealthBar value={sysHealth} label="Overall Score" color={sysHealth > 70 ? '#10B981' : '#F59E0B'} />
                <Box sx={{ mt: 1 }}><HealthBar value={dbOk ? 100 : 0} label="Database" color={dbOk ? '#10B981' : '#EF4444'} /></Box>
              </Box>
              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Schools</Typography>
                <StatRow label="Total"  value={s.schools?.total  ?? '—'} />
                <StatRow label="Active" value={s.schools?.active ?? '—'} color={TEAL} />
              </Box>
              <Box sx={{ bgcolor: CARD, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 0.75 }}>Applications</Typography>
                <StatRow label="Total"    value={tot} />
                <StatRow label="Approved" value={appr} color="#10B981" />
                <StatRow label="Pending"  value={apps.pending || 0} color="#F59E0B" />
                <StatRow label="Rejected" value={rej}  color="#EF4444" />
              </Box>
            </>
          )}
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AiPanel />
        </Box>
      )}
    </Box>
  );
};

// ── KPI tile ─────────────────────────────────────────────────────────────────
const KpiTile = ({ Icon, label, value, color, sub, idx }) => (
  <Box sx={{ flex: 1, px: 2, py: 1.25, borderRight: `1px solid ${BORDER}`, '&:last-child': { borderRight: 'none' }, display: 'flex', alignItems: 'center', gap: 1.25, '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' }, transition: 'background-color 0.15s', animation: `kpiIn 0.35s ease ${idx * 0.07}s both` }}>
    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon sx={{ color, fontSize: 16 }} />
    </Box>
    <Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem', color, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.63rem', color: INK_SOFT }}>{label}</Typography>
      {sub && <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', color: INK_FAINT }}>{sub}</Typography>}
    </Box>
  </Box>
);

// ── School term report center ─────────────────────────────────────────────────
const SchoolReport = ({ schoolName, report, loading }) => {
  if (loading) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <CircularProgress size={28} sx={{ color: TEAL }} />
    </Box>
  );

  if (!report) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Typography sx={{ fontFamily: FONT, color: INK_FAINT }}>Failed to load report.</Typography>
    </Box>
  );

  const attend = Number(report.attendance?.attendance_rate || 0);
  const pass   = Number(report.performance?.pass_rate     || 0);
  const avg    = Number(report.performance?.avg_percentage || 0);

  const marksDist = [
    { name: '0–49',  value: Number(report.marksDist?.below_50 || 0), color: '#EF4444' },
    { name: '50–59', value: Number(report.marksDist?.s50_59   || 0), color: '#F59E0B' },
    { name: '60–69', value: Number(report.marksDist?.s60_69   || 0), color: '#3B82F6' },
    { name: '70–79', value: Number(report.marksDist?.s70_79   || 0), color: TEAL },
    { name: '80+',   value: Number(report.marksDist?.above_80 || 0), color: '#10B981' },
  ];

  const loginTrend = (report.loginTrend || []).map(d => ({
    day:     d.day ? String(d.day).slice(5) : '',
    Admin:   Number(d.admin   || 0),
    Teacher: Number(d.teacher || 0),
    Student: Number(d.student || 0),
  }));

  const usageData = [
    { role: 'Admins',   total: Number(report.staff?.admins?.total   || 0), active30d: Number(report.staff?.admins?.logged_in_30d   || 0), color: TEAL },
    { role: 'Teachers', total: Number(report.staff?.teachers?.total || 0), active30d: Number(report.staff?.teachers?.logged_in_30d || 0), color: '#8B5CF6' },
    { role: 'Students', total: Number(report.staff?.students?.total || 0), active30d: Number(report.staff?.students?.logged_in_30d || 0), color: '#3B82F6' },
    { role: 'Parents',  total: Number(report.staff?.parents?.total  || 0), active30d: 0, color: '#F59E0B' },
  ];

  const appFunnel = [
    { name: 'Pending',  v: Number(report.applications?.pending  || 0), color: '#F59E0B' },
    { name: 'Approved', v: Number(report.applications?.approved || 0), color: '#10B981' },
    { name: 'Rejected', v: Number(report.applications?.rejected || 0), color: '#EF4444' },
  ];

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* School header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 0.5, animation: 'cardIn 0.3s ease' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: `${TEAL}18`, border: `1px solid ${TEAL}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SchoolRoundedIcon sx={{ color: TEAL, fontSize: 18 }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '0.95rem', color: INK }}>{schoolName}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>Term Report — Platform Analytics</Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Chip label={`${attend}% Attendance`} size="small" sx={{ fontFamily: FONT, fontSize: '0.66rem', height: 22, bgcolor: `${TEAL}18`, color: TEAL, fontWeight: 700 }} />
          <Chip label={`${pass}% Pass Rate`} size="small" sx={{ fontFamily: FONT, fontSize: '0.66rem', height: 22, bgcolor: '#10B98118', color: '#10B981', fontWeight: 700 }} />
        </Box>
      </Box>

      {/* Row 1: Gauges + Marks distribution */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

        {/* Big gauges */}
        <Box sx={{ bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`, p: 2, display: 'flex', gap: 3, alignItems: 'center', animation: 'cardIn 0.35s ease 0.05s both' }}>
          <ArcGauge pct={attend / 100} label="Attendance Rate" size={120} color={attend >= 80 ? '#10B981' : attend >= 60 ? '#F59E0B' : '#EF4444'} />
          <ArcGauge pct={pass / 100}   label="Pass Rate"       size={120} color={pass >= 70 ? '#10B981' : pass >= 50 ? '#F59E0B' : '#EF4444'} />
          <ArcGauge pct={avg / 100}    label="Avg Score"       size={120} color={TEAL} />
        </Box>

        {/* Marks distribution */}
        <Box sx={{ flex: 1, minWidth: 220, bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`, p: 2, animation: 'cardIn 0.35s ease 0.1s both' }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: INK, mb: 1.5 }}>Marks Distribution</Typography>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={marksDist} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 10 }} axisLine={false} tickLine={false} />
              <RTooltip {...DARK_TT} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>{marksDist.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Row 2: Login trend (14 days) */}
      <Box sx={{ bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`, p: 2, animation: 'cardIn 0.35s ease 0.15s both' }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: INK, mb: 1.5 }}>Login Activity — Last 14 Days</Typography>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={loginTrend} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <RTooltip {...DARK_TT} />
            <Legend wrapperStyle={{ fontFamily: FONT, fontSize: '0.68rem', paddingTop: 4 }} />
            <Line type="monotone" dataKey="Admin"   stroke={TEAL}      strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Teacher" stroke="#8B5CF6"   strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Student" stroke="#3B82F6"   strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Row 3: Platform usage by role + Application funnel */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

        {/* Usage by role */}
        <Box sx={{ flex: 2, minWidth: 260, bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`, p: 2, animation: 'cardIn 0.35s ease 0.2s both' }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: INK, mb: 1.5 }}>Platform Usage — 30-Day Active Logins</Typography>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={usageData} barSize={20} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="role" tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RTooltip {...DARK_TT} />
              <Bar dataKey="total"    name="Total"     radius={[0, 0, 0, 0]} fill={BORDER} />
              <Bar dataKey="active30d" name="Active 30d" radius={[4, 4, 0, 0]}>
                {usageData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
            {usageData.map(d => (
              <Box key={d.role} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: d.color }} />
                <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', color: INK_SOFT }}>{d.role}: {d.total} total, {d.active30d} active</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Application funnel */}
        <Box sx={{ flex: 1, minWidth: 180, bgcolor: CARD, borderRadius: '10px', border: `1px solid ${BORDER}`, p: 2, animation: 'cardIn 0.35s ease 0.25s both' }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: INK, mb: 0.5 }}>Applications</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', color: INK_FAINT, mb: 1 }}>Total: {report.applications?.total ?? 0}</Typography>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={appFunnel} layout="vertical" barSize={14} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: INK_FAINT, fontFamily: FONT, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={55} tick={{ fill: INK_SOFT, fontFamily: FONT, fontSize: 10 }} axisLine={false} tickLine={false} />
              <RTooltip {...DARK_TT} />
              <Bar dataKey="v" radius={[0, 4, 4, 0]}>{appFunnel.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Row 4: Staff overview cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.25, animation: 'cardIn 0.35s ease 0.3s both' }}>
        {[
          { label: 'School Admins', Icon: PersonRoundedIcon,         color: TEAL,      total: report.staff?.admins?.total, active: report.staff?.admins?.active,   recent: report.staff?.admins?.logged_in_7d },
          { label: 'Teachers',      Icon: MenuBookRoundedIcon,        color: '#8B5CF6', total: report.staff?.teachers?.total, active: report.staff?.teachers?.active, recent: report.staff?.teachers?.logged_in_7d },
          { label: 'Students',      Icon: PeopleRoundedIcon,          color: '#3B82F6', total: report.staff?.students?.total, active: report.staff?.students?.active, recent: report.staff?.students?.logged_in_7d },
          { label: 'Parents',       Icon: FamilyRestroomRoundedIcon,  color: '#F59E0B', total: report.staff?.parents?.total,  active: null, recent: null },
        ].map(({ label, Icon, color, total, active, recent }) => (
          <Box key={label} sx={{ bgcolor: CARD, borderRadius: '9px', border: `1px solid ${BORDER}`, p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: '6px', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ color, fontSize: 13 }} />
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, color: INK }}>{label}</Typography>
            </Box>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.3rem', color, lineHeight: 1 }}>{total ?? 0}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>total</Typography>
            {active != null && <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', color: INK_SOFT, mt: 0.3 }}>{active} active · {recent ?? 0} this week</Typography>}
          </Box>
        ))}
      </Box>

    </Box>
  );
};

// ── All-schools overview center ───────────────────────────────────────────────
const AllSchoolsCenter = ({ stats, schools, loading, onSelectSchool }) => {
  const s    = stats || {};
  const apps = s.applications || {};
  const dbOk = s.database?.connected === true;
  const errCount = s.system?.error_count_last_hour || 0;
  const latency  = s.system?.avg_response_ms || 0;
  const sysHealth = Math.max(0, Math.round((dbOk ? 40 : 0) + Math.max(0, 30 - errCount * 3) + Math.max(0, 30 - latency / 10)));

  const KPI = [
    { Icon: SchoolRoundedIcon,      label: 'Schools',      value: s.schools?.active ?? '—', color: TEAL,      sub: `${s.schools?.total ?? 0} total` },
    { Icon: AssignmentRoundedIcon,  label: 'Applications', value: apps.total || 0,           color: '#3B82F6', sub: `${apps.pending || 0} pending` },
    { Icon: CheckCircleRoundedIcon, label: 'Approved',     value: apps.approved || 0,         color: '#10B981', sub: (() => { const d = (apps.approved||0)+(apps.rejected||0); return d > 0 ? `${Math.round((apps.approved||0)*100/d)}% rate` : '—'; })() },
    { Icon: PeopleRoundedIcon,      label: 'Admins',       value: s.admins?.total ?? '—',    color: '#8B5CF6', sub: `${s.admins?.active ?? 0} active` },
    { Icon: TrendingUpRoundedIcon,  label: 'Sys Health',   value: `${sysHealth}%`,            color: sysHealth > 70 ? '#10B981' : sysHealth > 40 ? '#F59E0B' : '#EF4444', sub: dbOk ? 'DB connected' : 'DB error' },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {KPI.map((k, i) => <KpiTile key={i} idx={i} {...k} />)}
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress size={28} sx={{ color: TEAL }} />
          </Box>
        ) : schools.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, animation: 'cardIn 0.4s ease' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: `${TEAL}14`, border: `2px dashed ${TEAL}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolRoundedIcon sx={{ color: TEAL, fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: INK }}>No schools yet</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_FAINT }}>Create a school to see per-school analytics here.</Typography>
          </Box>
        ) : (
          <>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.09em', mb: 1.5 }}>
              Schools — {schools.length} registered · click a card or use the dropdown to view term report
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.5 }}>
              {schools.map((s, idx) => (
                <SchoolCard key={s.id} school={s} idx={idx} onClick={onSelectSchool} />
              ))}
            </Box>
          </>
        )}
      </Box>
    </>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const SystemDashboard = () => {
  // School selection lives here — passed DOWN as props so there is no context
  // timing issue (hooks run before SystemLayout's Provider mounts).
  const [schoolId,   setSchoolId]   = useState(null);
  const [schoolName, setSchoolName] = useState(null);

  const [stats,   setStats]   = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report,  setReport]  = useState(null);
  const [repLoad, setRepLoad] = useState(false);

  const handleSchoolChange = useCallback(({ schoolId: id, schoolName: name }) => {
    setSchoolId(id ?? null);
    setSchoolName(name ?? null);
  }, []);

  // Load global stats + schools list once
  const loadBase = useCallback(async () => {
    setLoading(true);
    const h = { Authorization: `Bearer ${token()}` };
    const [sR, schR] = await Promise.allSettled([
      fetch(`${API_BASE}/api/system/stats`,   { headers: h }).then(r => r.json()),
      fetch(`${API_BASE}/api/system/schools`, { headers: h }).then(r => r.json()),
    ]);
    if (sR.status   === 'fulfilled') setStats(sR.value);
    if (schR.status === 'fulfilled') setSchools(Array.isArray(schR.value) ? schR.value : []);
    setLoading(false);
  }, []);

  // Load per-school report whenever selection changes
  useEffect(() => {
    if (!schoolId) { setReport(null); return; }
    setRepLoad(true);
    fetch(`${API_BASE}/api/system/schools/${schoolId}/report`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => setReport(d))
      .catch(() => setReport(null))
      .finally(() => setRepLoad(false));
  }, [schoolId]);

  useEffect(() => { loadBase(); }, [loadBase]);

  const handleCardClick = useCallback((s) => {
    setSchoolId(s.id);
    setSchoolName(s.name);
  }, []);

  const viewingSchool = Boolean(schoolId);
  const title    = viewingSchool ? schoolName : 'Overview';
  const subtitle = viewingSchool ? 'Term Report' : 'System Dashboard';

  return (
    <SystemLayout
      title={title}
      subtitle={subtitle}
      selectedSchoolId={schoolId}
      selectedSchoolName={schoolName}
      onSchoolChange={handleSchoolChange}
    >
      <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* Center — key forces remount + animation on school switch */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }} key={schoolId ?? 'all'}>
          {viewingSchool ? (
            <SchoolReport schoolName={schoolName} report={report} loading={repLoad} />
          ) : (
            <AllSchoolsCenter stats={stats} schools={schools} loading={loading} onSelectSchool={handleCardClick} />
          )}
        </Box>

        {/* Right panel */}
        <RightPanel stats={stats} report={report} viewingSchool={viewingSchool} />
      </Box>

      <style>{`
        @keyframes cardIn  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes kpiIn   { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes msgIn   { from { opacity:0; transform:translateY(4px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes pageSlideIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes dot     { 0%,80%,100% { transform:scale(0.6); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }
      `}</style>
    </SystemLayout>
  );
};

export default SystemDashboard;
