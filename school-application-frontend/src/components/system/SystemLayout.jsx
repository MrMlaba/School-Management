import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DashboardRoundedIcon      from '@mui/icons-material/DashboardRounded';
import SchoolRoundedIcon         from '@mui/icons-material/SchoolRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import SupportAgentRoundedIcon   from '@mui/icons-material/SupportAgentRounded';
import HistoryRoundedIcon        from '@mui/icons-material/HistoryRounded';
import GroupsRoundedIcon         from '@mui/icons-material/GroupsRounded';
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded';
import API_BASE from '../../config';

// ── Dark design tokens ────────────────────────────────────────────────────────
const BG        = '#0A1628';
const SIDEBAR   = '#0D1E33';
const CARD      = '#122040';
const TEAL      = '#00C9B8';
const BORDER    = 'rgba(255,255,255,0.08)';
const INK       = '#E2E8F0';
const INK_SOFT  = '#94A3B8';
const INK_FAINT = '#4A6080';
const FONT      = "'IBM Plex Sans', sans-serif";
const BLUE      = TEAL;   // legacy alias still imported by other pages

// ── Nested dark theme — all MUI components inside SystemLayout go dark ────────
const useDarkTheme = () => useMemo(() => createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: TEAL },
    secondary:  { main: '#3B82F6' },
    error:      { main: '#EF4444' },
    warning:    { main: '#F59E0B' },
    success:    { main: '#10B981' },
    background: { default: BG, paper: CARD },
    text: { primary: INK, secondary: INK_SOFT, disabled: INK_FAINT },
    divider: BORDER,
    action: { hover: 'rgba(255,255,255,0.04)', selected: `${TEAL}18` },
  },
  typography: { fontFamily: FONT },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper:        { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell:    { styleOverrides: { root: { borderColor: BORDER }, stickyHeader: { bgcolor: SIDEBAR } } },
    MuiOutlinedInput:{ styleOverrides: { root: { '& fieldset': { borderColor: BORDER } } } },
    MuiButton:       { styleOverrides: { root: { textTransform: 'none', fontFamily: FONT, fontWeight: 600 } } },
    MuiChip:         { styleOverrides: { root: { fontFamily: FONT } } },
    MuiDialog:       { styleOverrides: { paper: { bgcolor: CARD, backgroundImage: 'none' } } },
    MuiMenu:         { styleOverrides: { paper: { bgcolor: CARD, backgroundImage: 'none' } } },
    MuiSelect:       { styleOverrides: { icon: { color: INK_SOFT } } },
    MuiInputLabel:   { styleOverrides: { root: { color: INK_SOFT, '&.Mui-focused': { color: TEAL } } } },
    MuiSnackbar:     { defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } } },
  },
}), []);

// ── Chapter navigation ────────────────────────────────────────────────────────
const CHAPTERS = [
  { label: 'Overview',  path: '/system/dashboard', Icon: DashboardRoundedIcon },
  { label: 'Schools',   path: '/system/schools',   Icon: SchoolRoundedIcon },
  { label: 'Admins',    path: '/system/admins',    Icon: ManageAccountsRoundedIcon },
  { label: 'Tickets',   path: '/system/tickets',   Icon: SupportAgentRoundedIcon },
  { label: 'Audit Log', path: '/system/logs',      Icon: HistoryRoundedIcon },
  { label: 'IT Team',   path: '/system/team',      Icon: GroupsRoundedIcon },
];

// ── Live health status pill ───────────────────────────────────────────────────
const HealthPill = () => {
  const [health, setHealth] = useState(null);
  const check = useCallback(() => {
    fetch(`${API_BASE}/api/system/health`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('systemToken')}` },
    }).then(r => r.json()).then(setHealth).catch(() => setHealth({ status: 'unknown' }));
  }, []);
  useEffect(() => { check(); const id = setInterval(check, 60000); return () => clearInterval(id); }, [check]);

  const ok    = health?.status === 'operational';
  const known = health?.status && health.status !== 'unknown';
  const dot   = !known ? INK_FAINT : ok ? '#10B981' : '#EF4444';
  const label = !known ? 'Checking…' : ok ? 'Operational' : 'Degraded';

  return (
    <Tooltip title={health?.database?.latencyMs ? `DB ${health.database.latencyMs}ms` : ''}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dot, boxShadow: known ? `0 0 0 3px ${dot}33` : 'none', flexShrink: 0 }} />
        <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_SOFT, whiteSpace: 'nowrap' }}>{label}</Typography>
      </Box>
    </Tooltip>
  );
};

// ── Open-ticket badge counter ─────────────────────────────────────────────────
const useOpenTicketCount = () => {
  const [count, setCount] = useState(0);
  const check = useCallback(() => {
    fetch(`${API_BASE}/api/system/support-tickets?status=open`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('systemToken')}` },
    }).then(r => r.json()).then(d => setCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
  }, []);
  useEffect(() => { check(); const id = setInterval(check, 30000); return () => clearInterval(id); }, [check]);
  return count;
};

// ── Main layout component ─────────────────────────────────────────────────────
const SystemLayout = ({ title, subtitle, children }) => {
  const theme        = useDarkTheme();
  const navigate     = useNavigate();
  const location     = useLocation();
  const openTickets  = useOpenTicketCount();

  const handleLogout = () => {
    sessionStorage.removeItem('systemToken');
    sessionStorage.removeItem('systemUsername');
    navigate('/system');
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', display: 'flex', bgcolor: BG, overflow: 'hidden', fontFamily: FONT }}>

        {/* ── Left icon sidebar ─────────────────────────────────── */}
        <Box sx={{
          width: 54, flexShrink: 0,
          bgcolor: SIDEBAR, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          py: 1.5, gap: 0.5,
        }}>
          {/* Brand mark */}
          <Box sx={{
            width: 34, height: 34, borderRadius: '9px', bgcolor: TEAL, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
          }}>
            <SchoolRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>

          {/* Nav icons */}
          {CHAPTERS.map(c => {
            const active = location.pathname === c.path;
            const badge  = c.path === '/system/tickets' ? openTickets : 0;
            return (
              <Tooltip key={c.path} title={c.label} placement="right" arrow>
                <Box
                  onClick={() => navigate(c.path)}
                  sx={{
                    position: 'relative', width: 36, height: 36, borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    bgcolor: active ? `${TEAL}20` : 'transparent',
                    border: `1px solid ${active ? TEAL : 'transparent'}`,
                    color: active ? TEAL : INK_FAINT,
                    '&:hover': { bgcolor: `${TEAL}12`, color: TEAL },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <c.Icon sx={{ fontSize: 17 }} />
                  {badge > 0 && (
                    <Box sx={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: 14, height: 14, borderRadius: '999px', px: 0.25,
                      bgcolor: '#EF4444', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT, fontSize: '0.54rem', fontWeight: 700, lineHeight: 1,
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </Box>
                  )}
                </Box>
              </Tooltip>
            );
          })}

          <Box sx={{ flex: 1 }} />

          {/* Logout */}
          <Tooltip title="Logout" placement="right" arrow>
            <Box
              onClick={handleLogout}
              sx={{
                width: 36, height: 36, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: INK_FAINT,
                '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: '#EF4444' },
                transition: 'all 0.15s ease',
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 17 }} />
            </Box>
          </Tooltip>
        </Box>

        {/* ── Main area ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Top bar */}
          <Box sx={{
            height: 48, flexShrink: 0,
            bgcolor: SIDEBAR, borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5,
          }}>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: INK, lineHeight: 1.1 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography sx={{ fontFamily: FONT, fontSize: '0.67rem', color: INK_FAINT, mt: 0.1 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HealthPill />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT }}>
                {sessionStorage.getItem('systemUsername') || 'sysadmin'}
              </Typography>
            </Box>
          </Box>

          {/* Content — fills remaining height, children manage their own scroll */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </Box>
        </Box>

      </Box>
    </ThemeProvider>
  );
};

// ── Exports — keep same names so every system page still compiles ─────────────
export { FONT, BLUE, TEAL, BORDER, BG, SIDEBAR, CARD, INK, INK_SOFT, INK_FAINT };
export const BG_SIDEBAR = SIDEBAR;
export const BG_CONTENT = BG;
export default SystemLayout;
