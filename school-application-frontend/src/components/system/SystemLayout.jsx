import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DashboardRoundedIcon      from '@mui/icons-material/DashboardRounded';
import SchoolRoundedIcon         from '@mui/icons-material/SchoolRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import HistoryRoundedIcon        from '@mui/icons-material/HistoryRounded';
import SupportAgentRoundedIcon   from '@mui/icons-material/SupportAgentRounded';
import GroupsRoundedIcon         from '@mui/icons-material/GroupsRounded';
import LogoutRoundedIcon         from '@mui/icons-material/LogoutRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
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
const BLUE      = TEAL;

// ── Nested dark MUI theme ─────────────────────────────────────────────────────
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
    MuiPaper:         { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell:     { styleOverrides: { root: { borderColor: BORDER }, stickyHeader: { background: SIDEBAR } } },
    MuiButton:        { styleOverrides: { root: { textTransform: 'none', fontFamily: FONT, fontWeight: 600 } } },
    MuiChip:          { styleOverrides: { root: { fontFamily: FONT } } },
    MuiDialog:        { styleOverrides: { paper: { bgcolor: CARD } } },
    MuiMenu:          { styleOverrides: { paper: { bgcolor: CARD } } },
    MuiSelect:        { styleOverrides: { icon: { color: INK_SOFT } } },
    MuiInputLabel:    { styleOverrides: { root: { color: INK_SOFT, '&.Mui-focused': { color: TEAL } } } },
    MuiOutlinedInput: { styleOverrides: { root: { '& fieldset': { borderColor: BORDER } } } },
    MuiSnackbar:      { defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } } },
  },
}), []);

// ── Main nav items ────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { label: 'Overview',  path: '/system/dashboard', Icon: DashboardRoundedIcon },
  { label: 'Schools',   path: '/system/schools',   Icon: SchoolRoundedIcon },
  { label: 'Admins',    path: '/system/admins',    Icon: ManageAccountsRoundedIcon },
  { label: 'Audit Log', path: '/system/logs',      Icon: HistoryRoundedIcon },
];

// Always pinned at bottom of nav
const NAV_PINNED = [
  { label: 'Tickets',  path: '/system/tickets', Icon: SupportAgentRoundedIcon, badge: true },
  { label: 'IT Team',  path: '/system/team',    Icon: GroupsRoundedIcon },
];

// ── Live health status ────────────────────────────────────────────────────────
const HealthPill = () => {
  const [health, setHealth] = useState(null);
  const check = useCallback(() => {
    fetch(`${API_BASE}/api/system/health`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('systemToken')}` },
    }).then(r => r.json()).then(setHealth).catch(() => setHealth({ status: 'unknown' }));
  }, []);
  useEffect(() => { check(); const id = setInterval(check, 60000); return () => clearInterval(id); }, [check]);
  const ok = health?.status === 'operational';
  const known = health?.status && health.status !== 'unknown';
  const dot = !known ? INK_FAINT : ok ? '#10B981' : '#EF4444';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dot, boxShadow: known ? `0 0 0 3px ${dot}30` : 'none', flexShrink: 0 }} />
      <Typography sx={{ fontFamily: FONT, fontSize: '0.67rem', color: INK_SOFT }}>
        {!known ? 'Checking…' : ok ? 'Operational' : 'Degraded'}
      </Typography>
    </Box>
  );
};

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

// ── Navigation item ───────────────────────────────────────────────────────────
const NavItem = ({ item, active, badge }) => {
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate(item.path)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        mx: 1, px: 1.5, py: 0.85, borderRadius: '8px', cursor: 'pointer',
        bgcolor: active ? `${TEAL}18` : 'transparent',
        color: active ? TEAL : INK_SOFT,
        '&:hover': { bgcolor: active ? `${TEAL}20` : 'rgba(255,255,255,0.04)', color: active ? TEAL : INK },
        transition: 'all 0.18s ease',
        position: 'relative',
      }}
    >
      {active && (
        <Box sx={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', bgcolor: TEAL }} />
      )}
      <item.Icon sx={{ fontSize: 16, flexShrink: 0 }} />
      <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: active ? 700 : 500, flex: 1, color: 'inherit' }}>
        {item.label}
      </Typography>
      {badge > 0 && (
        <Box sx={{ minWidth: 18, height: 18, px: 0.5, borderRadius: '999px', bgcolor: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
          {badge > 9 ? '9+' : badge}
        </Box>
      )}
    </Box>
  );
};

// ── Layout ────────────────────────────────────────────────────────────────────
const SystemLayout = ({ title, subtitle, children }) => {
  const theme       = useDarkTheme();
  const navigate    = useNavigate();
  const location    = useLocation();
  const openTickets = useOpenTicketCount();

  const handleLogout = () => {
    sessionStorage.removeItem('systemToken');
    sessionStorage.removeItem('systemUsername');
    navigate('/system');
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', display: 'flex', bgcolor: BG, overflow: 'hidden', fontFamily: FONT }}>

        {/* ── Left navigation panel ─────────────────────────────── */}
        <Box sx={{
          width: 230, flexShrink: 0,
          bgcolor: SIDEBAR, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Brand + context selector */}
          <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1px solid ${BORDER}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SchoolRoundedIcon sx={{ color: '#fff', fontSize: 15 }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '0.75rem', color: INK, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                  SYSTEM ADMIN
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.6rem', color: INK_FAINT }}>Service Provider Console</Typography>
              </Box>
            </Box>

            {/* Context pill — "Turkey"-style selector */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              px: 1.25, py: 0.65, bgcolor: CARD, borderRadius: '7px',
              border: `1px solid ${BORDER}`, cursor: 'default',
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: TEAL, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.74rem', fontWeight: 600, color: INK, flex: 1 }}>
                All Schools
              </Typography>
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 14, color: INK_FAINT }} />
            </Box>
          </Box>

          {/* Main nav */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.1em', px: 2.5, mb: 0.5 }}>
              Functions
            </Typography>
            {NAV_MAIN.map(item => (
              <NavItem key={item.path} item={item} active={location.pathname === item.path} />
            ))}
          </Box>

          {/* Pinned — always accessible */}
          <Box sx={{ borderTop: `1px solid ${BORDER}`, py: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.1em', px: 2.5, mb: 0.5 }}>
              Quick Access
            </Typography>
            {NAV_PINNED.map(item => (
              <NavItem
                key={item.path}
                item={item}
                active={location.pathname === item.path}
                badge={item.badge ? openTickets : 0}
              />
            ))}
          </Box>

          {/* User + health + logout */}
          <Box sx={{ px: 2, py: 1.25, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 600, color: INK, lineHeight: 1.2 }}>
                {sessionStorage.getItem('systemUsername') || 'sysadmin'}
              </Typography>
              <HealthPill />
            </Box>
            <Tooltip title="Logout" placement="right">
              <Box onClick={handleLogout} sx={{ cursor: 'pointer', color: INK_FAINT, '&:hover': { color: '#EF4444' }, transition: 'color 0.15s' }}>
                <LogoutRoundedIcon sx={{ fontSize: 16 }} />
              </Box>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Main content area ─────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Slim top bar */}
          <Box sx={{
            height: 44, flexShrink: 0,
            bgcolor: SIDEBAR, borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', px: 2.5, gap: 1,
          }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: INK }}>
              {title}
            </Typography>
            {subtitle && (
              <>
                <Box sx={{ width: 1, height: 14, bgcolor: BORDER }} />
                <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_FAINT }}>{subtitle}</Typography>
              </>
            )}
          </Box>

          {/* Animated page content */}
          <Box
            key={location.pathname}
            sx={{
              flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
              animation: 'pageSlideIn 0.22s ease both',
            }}
          >
            {children}
          </Box>
        </Box>

      </Box>

      <style>{`
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ThemeProvider>
  );
};

export { FONT, BLUE, TEAL, BORDER, BG, SIDEBAR, CARD, INK, INK_SOFT, INK_FAINT };
export const BG_SIDEBAR = SIDEBAR;
export const BG_CONTENT = BG;
export default SystemLayout;
