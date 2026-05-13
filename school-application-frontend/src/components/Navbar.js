import React, { useEffect, useState, useRef } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import MenuIcon from '@mui/icons-material/Menu';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

// ── Font injection ────────────────────────────────────────────────────────
const useNavFonts = () => {
  useEffect(() => {
    if (document.getElementById('nav-fonts')) return;
    const link = document.createElement('link');
    link.id = 'nav-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Source+Sans+3:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const BODY_FONT    = "'Source Sans 3', sans-serif";
const DISPLAY_FONT = "'Merriweather', Georgia, serif";

// ── Nav link style — white text on glass ─────────────────────────────────
const NAV_LINK_SX = {
  fontFamily: BODY_FONT,
  fontWeight: 600,
  fontSize: '0.85rem',
  letterSpacing: '0.03em',
  textTransform: 'none',
  color: '#ffffff',
  px: 1.4,
  py: 0.5,
  minWidth: 'auto',
  borderRadius: 0,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -2,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: '2px',
    bgcolor: '#f0a500',
    transition: 'width 0.25s ease',
  },
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    '&::after': { width: '70%' },
  },
};

// ── Orange "Apply Online" button — exactly like DHS ──────────────────────
const APPLY_BTN_SX = {
  fontFamily: BODY_FONT,
  fontWeight: 700,
  fontSize: '0.88rem',
  letterSpacing: '0.03em',
  textTransform: 'none',
  bgcolor: '#f0a500',
  color: '#ffffff',
  px: 2.8,
  py: 1.1,
  borderRadius: '2px',
  ml: 2,
  flexShrink: 0,
  boxShadow: 'none',
  '&:hover': {
    bgcolor: '#d4920a',
    boxShadow: '0 4px 16px rgba(240,165,0,0.45)',
  },
  transition: 'all 0.2s ease',
};

// ── Mobile menu items ─────────────────────────────────────────────────────
const MOBILE_ITEM_SX = {
  fontFamily: BODY_FONT,
  fontWeight: 500,
  fontSize: '0.92rem',
  color: '#ffffff',
  py: 1.2,
  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
};

// ─────────────────────────────────────────────────────────────────────────
const Navbar = () => {
  useNavFonts();
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const holdTimer = useRef(null);
  const location  = useLocation();

  const [isAdmin,           setIsAdmin]           = useState(false);
  const [isStudent,         setIsStudent]         = useState(false);
  const [mobileMenuAnchor,  setMobileMenuAnchor]  = useState(null);

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem('adminToken'));
    setIsStudent(!!localStorage.getItem('nationalId'));
  }, [location]);

  // Secret admin hold / keyboard shortcut
  const handleAdminHoldStart = () => {
    holdTimer.current = setTimeout(() => navigate('/admin-login'), 2000);
  };
  const handleAdminHoldEnd = () => clearTimeout(holdTimer.current);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') navigate('/admin-login');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Logout handlers
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminSchool');
    setIsAdmin(false);
    setMobileMenuAnchor(null);
    navigate('/');
  };
  const handleStudentLogout = () => {
    localStorage.removeItem('nationalId');
    setIsStudent(false);
    setMobileMenuAnchor(null);
    navigate('/');
  };

  const closeMobileMenu = () => setMobileMenuAnchor(null);

  // ── Desktop nav ────────────────────────────────────────────────────────
  const renderDesktopNav = () => (
    <>
      {/* Centre: nav links */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, mx: 'auto' }}>
        <Button component={Link} to="/" sx={NAV_LINK_SX}>Home</Button>

        {isAdmin && (
          <>
            <Button component={Link} to="/admin"    sx={NAV_LINK_SX}>Applications</Button>
            <Button component={Link} to="/students" sx={NAV_LINK_SX}>Students</Button>
          </>
        )}

        {isStudent && !isAdmin && (
          <Button component={Link} to="/applicant-dashboard" sx={NAV_LINK_SX}>
            My Application
          </Button>
        )}

        {!isAdmin && !isStudent && (
          <Button component={Link} to="/login-applicant" sx={NAV_LINK_SX}>
            Check Status
          </Button>
        )}
      </Box>

      {/* Right: CTA / logout */}
      {isAdmin && (
        <Button
          onClick={handleAdminLogout}
          startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 15 }} />}
          sx={{ ...NAV_LINK_SX, border: '1px solid rgba(255,255,255,0.35)', borderRadius: '2px', px: 2 }}
        >
          Logout
        </Button>
      )}

      {isStudent && !isAdmin && (
        <Button
          onClick={handleStudentLogout}
          startIcon={<PersonIcon sx={{ fontSize: 15 }} />}
          sx={{ ...NAV_LINK_SX, border: '1px solid rgba(255,255,255,0.35)', borderRadius: '2px', px: 2 }}
        >
          Logout
        </Button>
      )}

      {!isAdmin && !isStudent && (
        <Button variant="contained" onClick={() => navigate('/apply')} sx={APPLY_BTN_SX}>
          Apply Online
        </Button>
      )}
    </>
  );

  // ── Mobile dropdown ────────────────────────────────────────────────────
  const renderMobileMenu = () => (
    <Menu
      anchorEl={mobileMenuAnchor}
      open={Boolean(mobileMenuAnchor)}
      onClose={closeMobileMenu}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        sx: {
          mt: 0.5,
          minWidth: 240,
          bgcolor: 'rgba(10,20,60,0.96)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: '2px',
        },
      }}
    >
      <MenuItem onClick={() => { navigate('/'); closeMobileMenu(); }} sx={MOBILE_ITEM_SX}>Home</MenuItem>

      {isAdmin && [
        <MenuItem key="apps"     onClick={() => { navigate('/admin');    closeMobileMenu(); }} sx={MOBILE_ITEM_SX}>Applications</MenuItem>,
        <MenuItem key="students" onClick={() => { navigate('/students'); closeMobileMenu(); }} sx={MOBILE_ITEM_SX}>Students</MenuItem>,
        <Divider key="div" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />,
        <MenuItem key="logout" onClick={handleAdminLogout} sx={{ ...MOBILE_ITEM_SX, color: '#f87171' }}>Logout (Admin)</MenuItem>,
      ]}

      {isStudent && !isAdmin && [
        <MenuItem key="dash"   onClick={() => { navigate('/applicant-dashboard'); closeMobileMenu(); }} sx={MOBILE_ITEM_SX}>My Application</MenuItem>,
        <Divider key="div" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />,
        <MenuItem key="logout" onClick={handleStudentLogout} sx={{ ...MOBILE_ITEM_SX, color: '#f87171' }}>Logout</MenuItem>,
      ]}

      {!isAdmin && !isStudent && [
        <MenuItem key="status" onClick={() => { navigate('/login-applicant'); closeMobileMenu(); }} sx={MOBILE_ITEM_SX}>Check Application Status</MenuItem>,
        <Divider key="div" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />,
        <MenuItem key="apply"  onClick={() => { navigate('/apply'); closeMobileMenu(); }}
          sx={{ ...MOBILE_ITEM_SX, color: '#f0a500', fontWeight: 700 }}>
          Apply Online →
        </MenuItem>,
      ]}
    </Menu>
  );

  // ─────────────────────────────────────────────────────────────────────
  return (
    <AppBar
      position="absolute"          /* sits on top of the hero image */
      elevation={0}
      sx={{
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        // Dark glass — image bleeds through just like DHS
        background: 'rgba(20, 30, 60, 0.45)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'none',
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 60, sm: 68 },
          px: { xs: 2, md: 4 },
          gap: 0,
        }}
      >
        {/* ── Logo ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            mr: { xs: 1, md: 3 },
            cursor: 'default',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onMouseDown={handleAdminHoldStart}
          onMouseUp={handleAdminHoldEnd}
          onMouseLeave={handleAdminHoldEnd}
          onTouchStart={handleAdminHoldStart}
          onTouchEnd={handleAdminHoldEnd}
        >
          {/* Crest placeholder — swap for <img src={logo} /> if you have one */}
          <Box
            sx={{
              width: 40, height: 40,
              bgcolor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SchoolIcon sx={{ color: '#ffffff', fontSize: 22 }} />
          </Box>

          <Box>
            <Typography
              sx={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: { xs: '0.78rem', sm: '0.92rem' },
                color: '#ffffff',
                lineHeight: 1.15,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {isMobile ? 'School\nApply' : 'School\nApplication System'}
            </Typography>
          </Box>
        </Box>

        {/* ── Desktop links + CTA ── */}
        {!isMobile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {renderDesktopNav()}
          </Box>
        ) : (
          <Box sx={{ ml: 'auto' }}>
            <IconButton
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
              sx={{
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '2px',
                p: 0.8,
              }}
            >
              <MenuIcon />
            </IconButton>
            {renderMobileMenu()}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

