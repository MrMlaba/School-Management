import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip, Menu, MenuItem, Divider } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DashboardRoundedIcon         from '@mui/icons-material/DashboardRounded';
import SchoolRoundedIcon            from '@mui/icons-material/SchoolRounded';
import ManageAccountsRoundedIcon    from '@mui/icons-material/ManageAccountsRounded';
import HistoryRoundedIcon           from '@mui/icons-material/HistoryRounded';
import SupportAgentRoundedIcon      from '@mui/icons-material/SupportAgentRounded';
import GroupsRoundedIcon            from '@mui/icons-material/GroupsRounded';
import LogoutRoundedIcon            from '@mui/icons-material/LogoutRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckRoundedIcon             from '@mui/icons-material/CheckRounded';
import SettingsRoundedIcon          from '@mui/icons-material/SettingsRounded';
import PeopleAltRoundedIcon         from '@mui/icons-material/PeopleAltRounded';
import CalendarMonthRoundedIcon     from '@mui/icons-material/CalendarMonthRounded';
import API_BASE from '../../config';

// ── Design tokens ─────────────────────────────────────────────────────────────
export const BG        = '#0A1628';
export const SIDEBAR   = '#0D1E33';
export const CARD      = '#122040';
export const TEAL      = '#00C9B8';
export const BORDER    = 'rgba(255,255,255,0.18)';
export const INK       = '#E2E8F0';
export const INK_SOFT  = '#94A3B8';
export const INK_FAINT = '#4A6080';
export const FONT      = "'IBM Plex Sans', sans-serif";
export const BLUE      = TEAL;
export const BG_SIDEBAR = SIDEBAR;
export const BG_CONTENT = BG;

// ── Dark MUI theme ────────────────────────────────────────────────────────────
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
    MuiMenu:          { styleOverrides: { paper: { background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' } } },
    MuiMenuItem:      { styleOverrides: { root: { fontFamily: FONT, fontSize: '0.8rem' } } },
    MuiSelect:        { styleOverrides: { icon: { color: INK_SOFT } } },
    MuiInputLabel:    { styleOverrides: { root: { color: INK_SOFT, '&.Mui-focused': { color: TEAL } } } },
    MuiOutlinedInput: { styleOverrides: { root: { '& fieldset': { borderColor: BORDER } } } },
    MuiSnackbar:      { defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } } },
  },
}), []);

// ── Nav definitions ───────────────────────────────────────────────────────────
const NAV_MAIN = [
  { label: 'Overview',  path: '/system/dashboard', Icon: DashboardRoundedIcon },
  { label: 'Schools',   path: '/system/schools',   Icon: SchoolRoundedIcon },
  { label: 'Admins',    path: '/system/admins',    Icon: ManageAccountsRoundedIcon },
  { label: 'Audit Log', path: '/system/logs',      Icon: HistoryRoundedIcon },
];
const NAV_PINNED = [
  { label: 'Tickets', path: '/system/tickets', Icon: SupportAgentRoundedIcon, badge: true },
  { label: 'IT Team', path: '/system/team',    Icon: GroupsRoundedIcon },
];

const NAV_SCHOOL = [
  { label: 'School Setup',  path: '/system/school-setup',     Icon: SettingsRoundedIcon },
  { label: 'Teachers',      path: '/system/school-teachers',  Icon: PeopleAltRoundedIcon },
  { label: 'Timetable',     path: '/system/school-timetable', Icon: CalendarMonthRoundedIcon },
];

// ── Health pill ───────────────────────────────────────────────────────────────
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

// ── Nav item ──────────────────────────────────────────────────────────────────
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
        transition: 'all 0.18s ease', position: 'relative',
      }}
    >
      {active && <Box sx={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', bgcolor: TEAL }} />}
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

// ── School selector — controlled via props ────────────────────────────────────
const SchoolSelector = ({ selectedSchoolId, selectedSchoolName, onSchoolChange, onlyOnDashboard }) => {
  const [schools, setSchools] = useState([]);
  const [anchor,  setAnchor]  = useState(null);
  const location = useLocation();
  const onDashboard = !onlyOnDashboard || location.pathname === '/system/dashboard';

  useEffect(() => {
    fetch(`${API_BASE}/api/system/schools`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('systemToken')}` },
    }).then(r => r.json()).then(d => setSchools(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const select = (s) => {
    if (s) {
      sessionStorage.setItem('selectedSchoolId', s.id);
      sessionStorage.setItem('selectedSchoolName', s.name);
    } else {
      sessionStorage.removeItem('selectedSchoolId');
      sessionStorage.removeItem('selectedSchoolName');
    }
    onSchoolChange(s ? { schoolId: s.id, schoolName: s.name } : { schoolId: null, schoolName: null });
    setAnchor(null);
  };

  return (
    <>
      <Box
        onClick={onDashboard ? e => setAnchor(e.currentTarget) : undefined}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          px: 1.25, py: 0.65, bgcolor: CARD, borderRadius: '7px',
          border: `1px solid ${anchor ? TEAL : BORDER}`,
          cursor: onDashboard ? 'pointer' : 'default',
          transition: 'border-color 0.15s',
          '&:hover': onDashboard ? { borderColor: `${TEAL}60` } : {},
        }}
      >
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: selectedSchoolId ? '#10B981' : TEAL, flexShrink: 0 }} />
        <Typography sx={{ fontFamily: FONT, fontSize: '0.74rem', fontWeight: 600, color: INK, flex: 1 }} noWrap>
          {selectedSchoolName || 'All Schools'}
        </Typography>
        {onDashboard && (
          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 14, color: INK_FAINT, flexShrink: 0, transform: anchor ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        )}
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { mt: 0.5, minWidth: 210 } }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => select(null)} sx={{ gap: 1 }}>
          <SchoolRoundedIcon sx={{ fontSize: 14, color: INK_FAINT }} />
          <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', flex: 1 }}>All Schools</Typography>
          {!selectedSchoolId && <CheckRoundedIcon sx={{ fontSize: 13, color: TEAL }} />}
        </MenuItem>
        {schools.length > 0 && <Divider sx={{ borderColor: BORDER, my: 0.5 }} />}
        {schools.map(s => (
          <MenuItem key={s.id} onClick={() => select(s)} sx={{ gap: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.is_active ? '#10B981' : INK_FAINT, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', flex: 1 }} noWrap>{s.name}</Typography>
            {selectedSchoolId === s.id && <CheckRoundedIcon sx={{ fontSize: 13, color: TEAL }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// ── Layout component ──────────────────────────────────────────────────────────
// Props:
//   title, subtitle      — top bar text
//   selectedSchoolId     — currently selected school id (optional, for selector)
//   selectedSchoolName   — currently selected school name (optional)
//   onSchoolChange       — (school: {schoolId, schoolName} | {schoolId:null}) => void
const SystemLayout = ({ title, subtitle, selectedSchoolId, selectedSchoolName, onSchoolChange, children }) => {
  const theme       = useDarkTheme();
  const navigate    = useNavigate();
  const location    = useLocation();
  const openTickets = useOpenTicketCount();

  const handleLogout = () => {
    ['systemToken', 'systemUsername', 'selectedSchoolId', 'selectedSchoolName'].forEach(k => sessionStorage.removeItem(k));
    navigate('/system');
  };

  const handleSchoolChange = onSchoolChange || (() => {});
  const navSchoolId = selectedSchoolId || sessionStorage.getItem('selectedSchoolId');
  const navSchoolName = selectedSchoolName || sessionStorage.getItem('selectedSchoolName');

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', display: 'flex', bgcolor: BG, overflow: 'hidden', fontFamily: FONT }}>

        {/* ── Left nav ──────────────────────────────────────── */}
        <Box sx={{ width: 230, flexShrink: 0, bgcolor: SIDEBAR, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Brand + selector */}
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
            <SchoolSelector
              selectedSchoolId={selectedSchoolId}
              selectedSchoolName={selectedSchoolName}
              onSchoolChange={handleSchoolChange}
              onlyOnDashboard
            />
          </Box>

          {/* Main nav */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.1em', px: 2.5, mb: 0.5 }}>
              Functions
            </Typography>
            {NAV_MAIN.map(item => (
              <NavItem key={item.path} item={item} active={location.pathname === item.path} />
            ))}

            {/* Per-school management — only when a school is selected */}
            {navSchoolId && (
              <>
                <Box sx={{ mx: 2, my: 1, borderTop: `1px solid ${BORDER}` }} />
                <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.1em', px: 2.5, mb: 0.5 }} noWrap>
                  {navSchoolName || 'School'}
                </Typography>
                {NAV_SCHOOL.map(item => (
                  <NavItem key={item.path} item={item} active={location.pathname === item.path} />
                ))}
              </>
            )}
          </Box>

          {/* Pinned */}
          <Box sx={{ borderTop: `1px solid ${BORDER}`, py: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.58rem', fontWeight: 700, color: INK_FAINT, textTransform: 'uppercase', letterSpacing: '0.1em', px: 2.5, mb: 0.5 }}>
              Quick Access
            </Typography>
            {NAV_PINNED.map(item => (
              <NavItem key={item.path} item={item} active={location.pathname === item.path} badge={item.badge ? openTickets : 0} />
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

        {/* ── Content ───────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Box sx={{ height: 44, flexShrink: 0, bgcolor: SIDEBAR, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', px: 2.5, gap: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: INK }}>{title}</Typography>
            {subtitle && (
              <>
                <Box sx={{ width: 1, height: 14, bgcolor: BORDER }} />
                <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_FAINT }}>{subtitle}</Typography>
              </>
            )}
          </Box>
          <Box key={location.pathname} sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'pageSlideIn 0.22s ease both' }}>
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

export default SystemLayout;
