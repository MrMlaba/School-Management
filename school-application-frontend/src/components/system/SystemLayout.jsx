import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, IconButton, Drawer, useMediaQuery, Tooltip,
} from '@mui/material';
import DashboardOutlinedIcon         from '@mui/icons-material/DashboardOutlined';
import SchoolOutlinedIcon            from '@mui/icons-material/SchoolOutlined';
import PeopleAltOutlinedIcon         from '@mui/icons-material/PeopleAltOutlined';
import HistoryOutlinedIcon           from '@mui/icons-material/HistoryOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import LogoutIcon                    from '@mui/icons-material/Logout';
import MenuIcon                      from '@mui/icons-material/Menu';
import ShieldOutlinedIcon            from '@mui/icons-material/ShieldOutlined';
import API_BASE from '../../config';
import { core } from '../../theme/tokens';

// ── Design tokens — clean enterprise-SaaS: light throughout, one brand accent ──
const SIDEBAR_W  = 248;
const BG_SIDEBAR = '#ffffff';
const BG_CONTENT = '#F8FAFC';
const BORDER     = '#E5E7EB';
const INK        = '#111827';
const INK_SOFT   = '#6B7280';
const INK_FAINT  = '#9CA3AF';
const BRAND      = core.brand;      // #1A3557 — same navy used across the rest of the app
const BRAND_SOFT = '#EEF2F7';
const BLUE       = BRAND;           // kept as the historical export name other pages already import
const FONT       = "'IBM Plex Sans', sans-serif";

const NAV_ITEMS = [
  { label: 'Overview',  path: '/system/dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
  { label: 'Schools',   path: '/system/schools',   icon: <SchoolOutlinedIcon fontSize="small" /> },
  { label: 'Admins',    path: '/system/admins',    icon: <PeopleAltOutlinedIcon fontSize="small" /> },
  { label: 'Tickets',   path: '/system/tickets',   icon: <ConfirmationNumberOutlinedIcon fontSize="small" /> },
  { label: 'Audit Log', path: '/system/logs',      icon: <HistoryOutlinedIcon fontSize="small" /> },
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

  const ok      = health?.status === 'operational';
  const known   = health?.status && health.status !== 'unknown';
  const dotColor = !known ? INK_FAINT : ok ? core.accent : core.danger;
  const label    = !known ? 'Checking status…' : ok ? 'All systems operational' : 'Service degraded';

  return (
    <Tooltip title={health?.database?.latencyMs != null ? `DB response ${health.database.latencyMs}ms` : ''}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.9,
        px: 1.4, py: 0.6,
        bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: '999px',
      }}>
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

// ── Sidebar content (shared between permanent + temporary drawer) ─────────────
const SidebarContent = ({ onNavigate, onLogout, currentPath }) => (
  <Box sx={{
    width: SIDEBAR_W, height: '100%',
    bgcolor: BG_SIDEBAR,
    display: 'flex', flexDirection: 'column',
  }}>
    {/* Logo area */}
    <Box sx={{ px: 2.5, py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '8px',
          bgcolor: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Typography sx={{
          fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: INK,
          letterSpacing: '0.01em',
        }}>
          System Admin
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_FAINT, pl: 0.5 }}>
        Service Provider Console
      </Typography>
    </Box>

    <Divider sx={{ borderColor: BORDER, mx: 2 }} />

    {/* Navigation */}
    <List sx={{ flex: 1, px: 1.5, pt: 1.5 }}>
      {NAV_ITEMS.map((item) => {
        const active = currentPath === item.path;
        return (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
            <ListItemButton
              onClick={() => onNavigate(item.path)}
              sx={{
                borderRadius: '7px',
                px: 1.5, py: 1,
                bgcolor: active ? BRAND_SOFT : 'transparent',
                borderLeft: active ? `3px solid ${BRAND}` : '3px solid transparent',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: active ? BRAND_SOFT : '#F3F4F6',
                },
              }}
            >
              <ListItemIcon sx={{
                minWidth: 32,
                color: active ? BRAND : INK_FAINT,
                transition: 'color 0.18s',
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: FONT,
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.875rem',
                  color: active ? INK : INK_SOFT,
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>

    <Divider sx={{ borderColor: BORDER, mx: 2 }} />

    {/* Logged in as + Logout */}
    <Box sx={{ px: 2.5, py: 2 }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT, mb: 1 }}>
        Logged in as
      </Typography>
      <Typography sx={{
        fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem',
        color: INK, mb: 1.5,
      }}>
        {sessionStorage.getItem('systemUsername') || 'sysadmin'}
      </Typography>
      <ListItemButton
        onClick={onLogout}
        sx={{
          borderRadius: '7px', px: 1.5, py: 0.9,
          border: `1px solid ${core.dangerBg}`,
          bgcolor: core.dangerBg,
          transition: 'all 0.18s',
          '&:hover': { bgcolor: '#FCE4E4', borderColor: core.danger },
        }}
      >
        <ListItemIcon sx={{ minWidth: 28, color: core.danger }}>
          <LogoutIcon sx={{ fontSize: 16 }} />
        </ListItemIcon>
        <ListItemText
          primary="Logout"
          primaryTypographyProps={{
            fontFamily: FONT, fontWeight: 600,
            fontSize: '0.82rem', color: core.danger,
          }}
        />
      </ListItemButton>
    </Box>
  </Box>
);

// ── Main layout component ─────────────────────────────────────
const SystemLayout = ({ title, subtitle, children }) => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const isMobile      = useMediaQuery('(max-width:768px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('systemToken');
    sessionStorage.removeItem('systemUsername');
    navigate('/system');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: BG_CONTENT }}>

      {/* ── Permanent sidebar (desktop) ── */}
      {!isMobile && (
        <Box sx={{
          width: SIDEBAR_W, flexShrink: 0,
          borderRight: `1px solid ${BORDER}`,
        }}>
          <SidebarContent
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            currentPath={location.pathname}
          />
        </Box>
      )}

      {/* ── Temporary drawer (mobile) ── */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <SidebarContent
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            currentPath={location.pathname}
          />
        </Drawer>
      )}

      {/* ── Main content area ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <Box sx={{
          px: { xs: 2, md: 3 }, py: 2,
          bgcolor: '#fff',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 2,
          flexShrink: 0,
        }}>
          {isMobile && (
            <IconButton size="small" onClick={() => setDrawerOpen(true)}
              sx={{ color: INK_SOFT }}>
              <MenuIcon fontSize="small" />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{
              fontFamily: FONT, fontWeight: 700,
              fontSize: { xs: '1rem', md: '1.1rem' },
              color: INK, lineHeight: 1.2,
            }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{
                fontFamily: FONT, fontSize: '0.75rem',
                color: INK_SOFT, mt: 0.2,
              }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <HealthPill />
          {/* Live time badge */}
          <Box sx={{
            px: 1.5, py: 0.5,
            bgcolor: BG_CONTENT,
            border: `1px solid ${BORDER}`,
            borderRadius: '6px',
            display: { xs: 'none', sm: 'block' },
          }}>
            <Typography sx={{
              fontFamily: FONT, fontSize: '0.7rem',
              color: INK_FAINT, fontWeight: 500,
            }}>
              {new Date().toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
            </Typography>
          </Box>
        </Box>

        {/* Scrollable page content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export { FONT, BLUE, BG_SIDEBAR, BG_CONTENT, BORDER, INK, INK_SOFT, INK_FAINT, BRAND_SOFT };
export default SystemLayout;
