import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, IconButton, Drawer, useMediaQuery,
} from '@mui/material';
import DashboardOutlinedIcon    from '@mui/icons-material/DashboardOutlined';
import SchoolOutlinedIcon       from '@mui/icons-material/SchoolOutlined';
import PeopleAltOutlinedIcon    from '@mui/icons-material/PeopleAltOutlined';
import HistoryOutlinedIcon      from '@mui/icons-material/HistoryOutlined';
import LogoutIcon               from '@mui/icons-material/Logout';
import MenuIcon                 from '@mui/icons-material/Menu';
import ShieldOutlinedIcon       from '@mui/icons-material/ShieldOutlined';

// ── Design tokens ─────────────────────────────────────────────
const SIDEBAR_W  = 240;
const BG_SIDEBAR = '#0f172a';   // deep navy
const BG_CONTENT = '#f1f5f9';   // light slate
const BLUE       = '#38bdf8';
const TEXT_DIM   = 'rgba(255,255,255,0.45)';
const FONT       = "'IBM Plex Sans', sans-serif";

const NAV_ITEMS = [
  { label: 'Overview',  path: '/system/dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
  { label: 'Schools',   path: '/system/schools',   icon: <SchoolOutlinedIcon fontSize="small" /> },
  { label: 'Admins',    path: '/system/admins',    icon: <PeopleAltOutlinedIcon fontSize="small" /> },
  { label: 'Audit Log', path: '/system/logs',      icon: <HistoryOutlinedIcon fontSize="small" /> },
];

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
          bgcolor: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#000' }} />
        </Box>
        <Typography sx={{
          fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: '#fff',
          letterSpacing: '0.01em',
        }}>
          System Admin
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: TEXT_DIM, pl: 0.5 }}>
        Service Provider Portal
      </Typography>
    </Box>

    <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 2 }} />

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
                bgcolor: active ? 'rgba(56,189,248,0.12)' : 'transparent',
                border: active ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: active ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
                },
              }}
            >
              <ListItemIcon sx={{
                minWidth: 32,
                color: active ? BLUE : TEXT_DIM,
                transition: 'color 0.18s',
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: FONT,
                  fontWeight: active ? 600 : 400,
                  fontSize: '0.875rem',
                  color: active ? '#fff' : TEXT_DIM,
                }}
              />
              {active && (
                <Box sx={{
                  width: 4, height: 4, borderRadius: '50%',
                  bgcolor: BLUE, ml: 0.5, flexShrink: 0,
                }} />
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>

    <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 2 }} />

    {/* Logged in as + Logout */}
    <Box sx={{ px: 2.5, py: 2 }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: TEXT_DIM, mb: 1 }}>
        Logged in as
      </Typography>
      <Typography sx={{
        fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem',
        color: 'rgba(255,255,255,0.75)', mb: 1.5,
      }}>
        {sessionStorage.getItem('systemUsername') || 'sysadmin'}
      </Typography>
      <ListItemButton
        onClick={onLogout}
        sx={{
          borderRadius: '7px', px: 1.5, py: 0.9,
          border: '1px solid rgba(239,68,68,0.2)',
          bgcolor: 'rgba(239,68,68,0.06)',
          transition: 'all 0.18s',
          '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 28, color: '#f87171' }}>
          <LogoutIcon sx={{ fontSize: 16 }} />
        </ListItemIcon>
        <ListItemText
          primary="Logout"
          primaryTypographyProps={{
            fontFamily: FONT, fontWeight: 600,
            fontSize: '0.82rem', color: '#f87171',
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
    <>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: BG_CONTENT }}>

        {/* ── Permanent sidebar (desktop) ── */}
        {!isMobile && (
          <Box sx={{
            width: SIDEBAR_W, flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
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
            PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}
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
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}>
            {isMobile && (
              <IconButton size="small" onClick={() => setDrawerOpen(true)}
                sx={{ color: '#64748b' }}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{
                fontFamily: FONT, fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.1rem' },
                color: '#0f172a', lineHeight: 1.2,
              }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography sx={{
                  fontFamily: FONT, fontSize: '0.75rem',
                  color: '#64748b', mt: 0.2,
                }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {/* Live time badge */}
            <Box sx={{
              px: 1.5, py: 0.5,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              display: { xs: 'none', sm: 'block' },
            }}>
              <Typography sx={{
                fontFamily: FONT, fontSize: '0.7rem',
                color: '#94a3b8', fontWeight: 500,
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
    </>
  );
};

export { FONT, BLUE, BG_SIDEBAR, BG_CONTENT };
export default SystemLayout;