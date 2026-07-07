import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip } from '@mui/material';
import API_BASE from '../../config';
import { core } from '../../theme/tokens';

// ── Design tokens — clean enterprise-SaaS: light throughout, one brand accent ──
const BG_SIDEBAR = '#ffffff';   // kept as an export name other pages still import
const BG_CONTENT = '#F8FAFC';
const BORDER     = '#E5E7EB';
const INK        = '#111827';
const INK_SOFT   = '#6B7280';
const INK_FAINT  = '#9CA3AF';
const BRAND      = core.brand;      // #1A3557 — same navy used across the rest of the app
const BLUE       = BRAND;           // historical export name other pages import
const FONT       = "'IBM Plex Sans', sans-serif";

// Numbered chapters — no icons; order here is the reading order of the console.
const CHAPTERS = [
  { n: '01', label: 'Overview',  path: '/system/dashboard' },
  { n: '02', label: 'Schools',   path: '/system/schools' },
  { n: '03', label: 'Admins',    path: '/system/admins' },
  { n: '04', label: 'Tickets',   path: '/system/tickets' },
  { n: '05', label: 'Audit Log', path: '/system/logs' },
  { n: '06', label: 'IT Team',   path: '/system/team' },
];

// ── Live platform health pill — polls /api/system/health, shown on every page ──
const HealthPill = () => {
  const [health, setHealth] = useState(null);

  const check = useCallback(() => {
    fetch(`${API_BASE}/api/system/health`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('systemToken')}` },
    })
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'unknown' }));
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [check]);

  const ok    = health?.status === 'operational';
  const known = health?.status && health.status !== 'unknown';
  const dotColor = !known ? INK_FAINT : ok ? core.accent : core.danger;
  const label    = !known ? 'Checking status…' : ok ? 'All systems operational' : 'Service degraded';

  return (
    <Tooltip title={health?.database?.latencyMs != null ? `DB response ${health.database.latencyMs}ms` : ''}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0,
          boxShadow: known ? `0 0 0 3px ${dotColor}22` : 'none',
        }} />
        <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600, color: INK_SOFT, whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ── Main layout component ─────────────────────────────────────
const SystemLayout = ({ title, subtitle, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem('systemToken');
    sessionStorage.removeItem('systemUsername');
    navigate('/system');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG_CONTENT }}>

      {/* ── Masthead ── */}
      <Box sx={{ bgcolor: '#fff', borderBottom: `1px solid ${BORDER}` }}>
        <Box sx={{
          maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 3 }, py: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5,
        }}>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: INK, letterSpacing: '0.02em' }}>
              SYSTEM ADMIN
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_FAINT }}>
              Service Provider Console
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
            <HealthPill />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_FAINT, display: { xs: 'none', sm: 'block' } }}>
              {new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT }}>
              {sessionStorage.getItem('systemUsername') || 'sysadmin'}
              <Box component="span" sx={{ color: BORDER, mx: 1 }}>|</Box>
              <Box
                component="span"
                onClick={handleLogout}
                sx={{ color: core.danger, fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                Logout
              </Box>
            </Typography>
          </Box>
        </Box>

        {/* ── Chapter strip — the entire nav, no sidebar, no icons ── */}
        <Box sx={{
          maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 3 },
          display: 'flex', gap: { xs: 2, md: 3.5 }, overflowX: 'auto',
          borderTop: `1px solid ${BORDER}`,
        }}>
          {CHAPTERS.map(c => {
            const active = location.pathname === c.path;
            return (
              <Box
                key={c.path}
                onClick={() => navigate(c.path)}
                sx={{
                  py: 1.1, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  borderBottom: active ? `2px solid ${BRAND}` : '2px solid transparent',
                  mb: '-1px',
                }}
              >
                <Typography sx={{
                  fontFamily: FONT, fontSize: '0.78rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? BRAND : INK_SOFT,
                }}>
                  <Box component="span" sx={{ fontFamily: 'monospace', color: active ? BRAND : INK_FAINT, mr: 0.75 }}>{c.n}</Box>
                  {c.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Page content ── */}
      <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.3rem' }, color: INK }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: INK_SOFT, mt: 0.3 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {children}
      </Box>
    </Box>
  );
};

export { FONT, BLUE, BG_SIDEBAR, BG_CONTENT, BORDER, INK, INK_SOFT, INK_FAINT };
export default SystemLayout;
