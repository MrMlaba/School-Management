import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Chip, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon  from '@mui/icons-material/ArrowBack';
import MenuBookIcon   from '@mui/icons-material/MenuBook';
import LogoutIcon     from '@mui/icons-material/Logout';
import SchoolIcon     from '@mui/icons-material/School';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const T = {
  navy:      '#0B1F3A',
  navyLight: '#1E3D6B',
  gold:      '#D4A843',
  goldLight: '#F0C96A',
  bg:        '#F4F6FB',
  white:     '#FFFFFF',
  border:    '#E3E8F0',
  muted:     '#7A8BA0',
  text:      '#1A2B3C',
  breakBg:   '#F1F3F7',
  breakText: '#9AABBD',
};

const BASE = 'http://localhost:5005';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };

/* ─── Deterministic subject colour palette ────────────────────────────────
   Each subject gets a consistent colour based on its name so the timetable
   reads like a real colour-coded school planner.                           */
const SUBJECT_PALETTE = [
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' }, // indigo
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' }, // green
  { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' }, // orange
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985' }, // sky
  { bg: '#FDF4FF', border: '#E9D5FF', text: '#6B21A8' }, // purple
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' }, // amber
  { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' }, // rose
  { bg: '#F0FDFA', border: '#99F6E4', text: '#134E4A' }, // teal
  { bg: '#FEF9EE', border: '#FDE68A', text: '#78350F' }, // yellow-dark
  { bg: '#F8FAFC', border: '#CBD5E1', text: '#334155' }, // slate
];

const subjectColor = (() => {
  const cache = {};
  return (name) => {
    if (!cache[name]) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
      cache[name] = SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
    }
    return cache[name];
  };
})();

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`;
};

const todayName = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long' });

const initials = () => {
  try {
    const p = JSON.parse(atob(localStorage.getItem('studentToken').split('.')[1]));
    return `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase();
  } catch { return '?'; }
};

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function StudentTimetable() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const navigate  = useNavigate();
  const today     = todayName();

  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    if (!token) { navigate('/student-login'); return; }
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/student/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem('studentToken');
          navigate('/student-login');
          return;
        }
        if (res.ok) setData(await res.json());
        else setError('Failed to load timetable.');
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('studentToken');
    navigate('/student-login');
  };

  /* ── Build slot lookup: { "Monday-2": { subjectName, teacherFirstName, ... } } */
  const slotMap = {};
  (data?.slots || []).forEach(s => {
    slotMap[`${s.dayOfWeek}-${s.periodNumber}`] = s;
  });

  /* ── Render ── */
  return (
    <Box sx={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Lora:wght@600;700&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Top nav ── */}
      <Box sx={{
        background: T.navy, px: { xs: 2, md: 4 }, height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 16px rgba(11,31,58,0.22)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MenuBookIcon sx={{ color: T.navy, fontSize: 17 }} />
          </Box>
          <Typography sx={{ color: T.white, fontWeight: 700, fontSize: '0.95rem', fontFamily: "'DM Sans', sans-serif" }}>
            Student Portal
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} size="small"
              sx={{ color: 'rgba(255,255,255,0.55)', '&:hover': { color: T.white, background: 'rgba(255,255,255,0.08)' } }}>
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Page header ── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyLight} 60%, #1A4A7A 100%)`,
        px: { xs: 2, md: 5 }, pt: 4, pb: 5, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(212,168,67,0.07)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: 20, right: 180, width: 70, height: 70, borderRadius: '50%', border: '1px solid rgba(212,168,67,0.15)', pointerEvents: 'none' }} />

        <Box sx={{ maxWidth: 1200, mx: 'auto', position: 'relative' }}>
          <Box
            onClick={() => navigate('/student-dashboard')}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mb: 2.5, cursor: 'pointer',
              color: 'rgba(255,255,255,0.55)', '&:hover': { color: T.white }, transition: 'color 0.15s' }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Dashboard</Typography>
          </Box>

          <Typography sx={{ color: T.gold, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', mb: 0.75, fontFamily: "'DM Sans', sans-serif" }}>
            Weekly Schedule
          </Typography>
          <Typography sx={{ color: T.white, fontSize: { xs: '1.7rem', md: '2.2rem' }, fontWeight: 700, fontFamily: "'Lora', serif", letterSpacing: '-0.02em', lineHeight: 1.2, mb: 1.5 }}>
            My Timetable
          </Typography>

          {data?.class && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ px: 1.5, py: 0.4, borderRadius: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <SchoolIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  Class {data.class.name}
                </Typography>
              </Box>
              {data.class.stream && (
                <Box sx={{ px: 1.5, py: 0.4, borderRadius: '20px', background: `${T.gold}22`, border: `1px solid ${T.gold}44` }}>
                  <Typography sx={{ color: T.goldLight, fontSize: '0.78rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                    {data.class.stream}
                  </Typography>
                </Box>
              )}
              <Box sx={{ px: 1.5, py: 0.4, borderRadius: '20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif" }}>
                  Today: {today}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ px: { xs: 1, md: 5 }, py: 4, maxWidth: 1280, mx: 'auto' }}>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: T.navy }} />
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>{error}</Typography>
          </Box>
        )}

        {!loading && !error && !data?.class && (
          <Box sx={{
            textAlign: 'center', py: 10, background: T.white,
            borderRadius: '16px', border: `1px solid ${T.border}`,
          }}>
            <SchoolIcon sx={{ fontSize: 52, color: T.border, mb: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: T.text, mb: 0.75, fontFamily: "'DM Sans', sans-serif" }}>
              No timetable yet
            </Typography>
            <Typography sx={{ color: T.muted, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }}>
              Your school admin hasn't set up a timetable for your class yet.
              <br />Check back soon.
            </Typography>
          </Box>
        )}

        {!loading && !error && data?.class && data.periods.length > 0 && (
          <Box sx={{
            background: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 16px rgba(11,31,58,0.07)',
            animation: 'fadeUp 0.4s ease both',
          }}>

            {/* ── Subject legend ── */}
            {(() => {
              const subjects = [...new Set(data.slots.map(s => s.subjectName))].sort();
              if (!subjects.length) return null;
              return (
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.border}`, background: '#FAFBFF', display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mr: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
                    Subjects:
                  </Typography>
                  {subjects.map(sub => {
                    const col = subjectColor(sub);
                    return (
                      <Box key={sub} sx={{ px: 1.25, py: 0.25, borderRadius: '6px', background: col.bg, border: `1px solid ${col.border}` }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: col.text, fontFamily: "'DM Sans', sans-serif" }}>
                          {sub}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              );
            })()}

            {/* ── Grid ── */}
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 680 }}>

                {/* Header row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', borderBottom: `2px solid ${T.navy}` }}>
                  {/* Period header cell */}
                  <Box sx={{ px: 2, py: 1.5, background: T.navy }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>
                      Period
                    </Typography>
                  </Box>
                  {/* Day header cells */}
                  {DAYS.map(day => {
                    const isToday = day === today;
                    return (
                      <Box key={day} sx={{
                        px: 2, py: 1.5,
                        background: isToday ? T.gold : T.navy,
                        borderLeft: `1px solid rgba(255,255,255,0.08)`,
                        textAlign: 'center',
                      }}>
                        <Typography sx={{
                          fontSize: '0.78rem', fontWeight: 800,
                          color: isToday ? T.navy : T.white,
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: '0.02em',
                        }}>
                          {DAY_SHORT[day]}
                        </Typography>
                        {isToday && (
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: T.navy, fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}>
                            Today
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>

                {/* Period rows */}
                {data.periods.map((period, pIdx) => {
                  const isBreak = period.isBreak;
                  const rowBg   = isBreak ? T.breakBg : (pIdx % 2 === 0 ? T.white : '#FAFBFD');

                  return (
                    <Box key={period.periodNumber} sx={{
                      display: 'grid',
                      gridTemplateColumns: '130px repeat(5, 1fr)',
                      borderBottom: `1px solid ${T.border}`,
                      background: rowBg,
                      '&:last-child': { borderBottom: 'none' },
                    }}>
                      {/* Period label */}
                      <Box sx={{
                        px: 2, py: isBreak ? 1 : 1.5,
                        borderRight: `1px solid ${T.border}`,
                        background: isBreak ? '#EAECF0' : T.white,
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      }}>
                        <Typography sx={{
                          fontSize: '0.78rem', fontWeight: 700,
                          color: isBreak ? T.breakText : T.navy,
                          fontFamily: "'DM Sans', sans-serif",
                          whiteSpace: 'nowrap',
                        }}>
                          {period.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: isBreak ? T.breakText : T.muted, fontFamily: "'DM Sans', sans-serif", mt: 0.2 }}>
                          {fmt12(period.timeStart)}–{fmt12(period.timeEnd)}
                        </Typography>
                      </Box>

                      {/* Day cells */}
                      {DAYS.map(day => {
                        const slot    = slotMap[`${day}-${period.periodNumber}`];
                        const isToday = day === today;

                        // Break cell
                        if (isBreak) return (
                          <Box key={day} sx={{
                            borderLeft: `1px solid ${T.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            py: 1,
                            background: isToday ? '#F0F2F6' : T.breakBg,
                          }}>
                            <Typography sx={{ fontSize: '0.68rem', color: T.breakText, fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif" }}>
                              {period.name}
                            </Typography>
                          </Box>
                        );

                        // Filled slot
                        if (slot) {
                          const col = subjectColor(slot.subjectName);
                          return (
                            <Box key={day} sx={{
                              borderLeft: `1px solid ${T.border}`,
                              px: 1.5, py: 1.25,
                              background: isToday ? col.bg : col.bg + 'BB',
                              borderTop: isToday ? `2px solid ${col.border}` : 'none',
                              position: 'relative',
                            }}>
                              {isToday && (
                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: col.text, borderRadius: '0 0 2px 2px', opacity: 0.4 }} />
                              )}
                              <Typography sx={{
                                fontSize: '0.78rem', fontWeight: 700,
                                color: col.text,
                                fontFamily: "'DM Sans', sans-serif",
                                lineHeight: 1.3,
                              }}>
                                {slot.subjectName}
                              </Typography>
                              <Typography sx={{ fontSize: '0.66rem', color: col.text, opacity: 0.75, fontFamily: "'DM Sans', sans-serif", mt: 0.25 }}>
                                {slot.teacherFirstName} {slot.teacherLastName}
                              </Typography>
                            </Box>
                          );
                        }

                        // Empty cell
                        return (
                          <Box key={day} sx={{
                            borderLeft: `1px solid ${T.border}`,
                            background: isToday ? '#F7F9FF' : rowBg,
                            minHeight: 56,
                          }} />
                        );
                      })}
                    </Box>
                  );
                })}

              </Box>
            </Box>

            {/* Footer note */}
            <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${T.border}`, background: '#FAFBFF' }}>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>
                Timetable set by your school admin · View only · Today ({today}) is highlighted
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}