// src/components/LoginLayout.js
// ─────────────────────────────────────────────────────────────
//  Shared split-panel login layout used by:
//    LoginPage.js        (Admin)
//    TeacherLoginPage.js (Teacher)
//    StudentLogin.js     (Student)
//    LoginApplicant.js   (Applicant)
// ─────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import BackgroundSlideshow from './BackgroundSlideshow';

export const B = {
  brand:    '#1A3557',
  brandDk:  '#122740',
  brandMd:  '#2563EB',
  brandLt:  '#EFF6FF',
  accent:   '#2E5FE8',
  border:   '#D0D7DE',
  text:     '#1A2332',
  muted:    '#6B7C93',
  mutedLt:  '#9FB0C2',
  white:    '#FFFFFF',
  bg:       '#F0F4F8',
  success:  '#16A34A',
  successL: '#DCFCE7',
  error:    '#DC2626',
  errorL:   '#FEE2E2',
};

export const FF = "'IBM Plex Sans', sans-serif";

export const useFonts = () => {
  useEffect(() => {
    if (document.getElementById('login-layout-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'login-layout-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400;1,600&display=swap';
    document.head.appendChild(link);
  }, []);
};

export const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontFamily: FF,
    bgcolor: B.white,
    '& fieldset': { borderColor: B.border },
    '&:hover fieldset': { borderColor: B.brandMd },
    '&.Mui-focused fieldset': { borderColor: B.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root': { fontFamily: FF, color: B.muted },
  '& .MuiInputLabel-root.Mui-focused': { color: B.accent },
  '& .MuiInputBase-input': { fontFamily: FF, color: B.text, fontSize: '0.9rem' },
};

// ── Shared left panel ─────────────────────────────────────────
export function LeftPanel({ role, tagline, features, badge }) {
  return (
    <Box sx={{
      display: { xs: 'none', md: 'flex' },
      width: '46%', flexShrink: 0,
      position: 'relative', overflow: 'hidden',
      flexDirection: 'column',
    }}>
      {/* Background slideshow */}
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <BackgroundSlideshow fullscreen />
      </Box>

      {/* Blue gradient overlay */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(155deg, rgba(26,53,87,0.82) 0%, rgba(37,99,235,0.65) 50%, rgba(26,53,87,0.88) 100%)`,
      }} />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', px: 5.5, py: 6 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 'auto' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: B.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SchoolIcon sx={{ color: '#fff', fontSize: 19 }} />
          </Box>
          <Typography sx={{ fontFamily: FF, fontWeight: 700, fontSize: '0.88rem', color: '#fff', lineHeight: 1.2 }}>
            School Management System
          </Typography>
        </Box>

        {/* Main text */}
        <Box sx={{ my: 'auto' }}>
          {/* Role badge */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            px: 1.5, py: 0.5, borderRadius: '100px', mb: 2.5,
          }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#7DD3FC' }} />
            <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {badge}
            </Typography>
          </Box>

          <Typography sx={{
            fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontSize: '2.6rem', fontWeight: 600,
            color: '#fff', lineHeight: 1.1, mb: 2,
            letterSpacing: '-0.02em',
          }}>
            {tagline}
          </Typography>

          <Typography sx={{ fontFamily: FF, fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, mb: 4, maxWidth: 320 }}>
            The complete school management platform for KwaZulu-Natal high schools.
          </Typography>

          {/* Features */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {features.map(f => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#7DD3FC' }} />
                </Box>
                <Typography sx={{ fontFamily: FF, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{f}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Typography sx={{ fontFamily: FF, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', mt: 'auto' }}>
          © {new Date().getFullYear()} School Management System · KwaZulu-Natal
        </Typography>
      </Box>
    </Box>
  );
}

// ── Right panel wrapper ───────────────────────────────────────
export function RightPanel({ children }) {
  return (
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      bgcolor: B.bg,
      px: { xs: 3, sm: 5, md: 6 },
      py: { xs: 5, md: 6 },
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle pattern */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(26,53,87,0.04) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }} />

      {/* Mobile background */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'absolute', inset: 0, zIndex: 1 }}>
        <BackgroundSlideshow fullscreen />
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(240,244,248,0.95)' }} />
      </Box>

      <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

// ── Full login shell ──────────────────────────────────────────
export function LoginShell({ leftProps, children }) {
  useFonts();
  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', fontFamily: FF, overflow: 'hidden' }}>
      <LeftPanel {...leftProps} />
      <RightPanel>{children}</RightPanel>
    </Box>
  );
}

// ── Mobile logo (shown instead of left panel on mobile) ───────
export function MobileLogo() {
  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: B.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SchoolIcon sx={{ color: '#fff', fontSize: 19 }} />
      </Box>
      <Typography sx={{ fontFamily: FF, fontWeight: 700, fontSize: '0.9rem', color: B.text }}>
        School Management System
      </Typography>
    </Box>
  );
}