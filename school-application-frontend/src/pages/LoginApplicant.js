// src/pages/LoginApplicant.js — Applicant status check
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography,
  InputAdornment, Alert, Divider,
} from '@mui/material';
import BadgeOutlinedIcon              from '@mui/icons-material/BadgeOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import SearchIcon                     from '@mui/icons-material/Search';
import ArrowForwardIcon               from '@mui/icons-material/ArrowForward';
import { LoginShell, MobileLogo, B, FF, inputSx } from '../components/LoginLayout';

const LEFT = {
  badge:    'Application Tracking',
  tagline:  'Your admission status, always up to date.',
  features: [
    'Check application status in real time',
    'View decisions from multiple schools',
    'Accept your offer online',
    'Receive instant notifications',
  ],
};

// Progress steps shown on the left panel
const PROGRESS = [
  { label: 'Application submitted',   done: true  },
  { label: 'Under review by school',  done: false },
  { label: 'Decision & offer letter', done: false },
  { label: 'Enrolment confirmation',  done: false },
];

export default function LoginApplicant() {
  const navigate = useNavigate();
  const [nationalId,    setNationalId]    = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [error,         setError]         = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nationalId && !applicationId) {
      setError('Please enter your National ID or Application ID to continue.');
      return;
    }
    setError('');
    if (nationalId)    navigate(`/applicant-dashboard?nationalId=${encodeURIComponent(nationalId)}`);
    else               navigate(`/applicant-dashboard?applicationId=${encodeURIComponent(applicationId)}`);
  };

  // Override left panel to add progress steps below features
  const CustomLeft = (
    <Box sx={{
      display: { xs: 'none', md: 'flex' },
      width: '46%', flexShrink: 0,
      position: 'relative', overflow: 'hidden',
      flexDirection: 'column',
    }}>
      {/* Background */}
      {(() => {
        const BackgroundSlideshow = require('../components/BackgroundSlideshow').default;
        return (
          <>
            <Box sx={{ position: 'absolute', inset: 0 }}><BackgroundSlideshow fullscreen /></Box>
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg, rgba(26,53,87,0.82) 0%, rgba(37,99,235,0.65) 50%, rgba(26,53,87,0.88) 100%)' }} />
          </>
        );
      })()}

      <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', px: 5.5, py: 6 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 'auto' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: B.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon sx={{ color: '#fff', fontSize: 19 }} />
          </Box>
          <Typography sx={{ fontFamily: FF, fontWeight: 700, fontSize: '0.88rem', color: '#fff', lineHeight: 1.2 }}>
            School Management System
          </Typography>
        </Box>

        <Box sx={{ my: 'auto' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', px: 1.5, py: 0.5, borderRadius: '100px', mb: 2.5 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#7DD3FC' }} />
            <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Application Tracking
            </Typography>
          </Box>

          <Typography sx={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: '2.6rem', fontWeight: 600, color: '#fff', lineHeight: 1.1, mb: 2, letterSpacing: '-0.02em' }}>
            Your admission status, always up to date.
          </Typography>

          {/* Progress tracker */}
          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 2 }}>
              Application Journey
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {PROGRESS.map((step, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, pb: i < PROGRESS.length - 1 ? 2 : 0, position: 'relative' }}>
                  {/* Vertical line */}
                  {i < PROGRESS.length - 1 && (
                    <Box sx={{ position: 'absolute', left: 11, top: 22, bottom: 0, width: 1.5, bgcolor: step.done ? 'rgba(125,211,252,0.4)' : 'rgba(255,255,255,0.1)' }} />
                  )}
                  {/* Dot */}
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: step.done ? B.accent : 'rgba(255,255,255,0.08)', border: `2px solid ${step.done ? '#7DD3FC' : 'rgba(255,255,255,0.2)'}`, zIndex: 1 }}>
                    {step.done && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />}
                  </Box>
                  <Typography sx={{ fontFamily: FF, fontSize: '0.82rem', color: step.done ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: step.done ? 600 : 400, pt: '2px' }}>
                    {step.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Typography sx={{ fontFamily: FF, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', mt: 'auto' }}>
          © {new Date().getFullYear()} School Management System · KwaZulu-Natal
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', fontFamily: FF, overflow: 'hidden' }}>
      {CustomLeft}

      {/* Right panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: B.bg, px: { xs: 3, sm: 5, md: 6 }, py: { xs: 5, md: 6 }, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(26,53,87,0.04) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        {/* Mobile bg */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'absolute', inset: 0, zIndex: 1 }}>
          {(() => { const Bg = require('../components/BackgroundSlideshow').default; return <><Bg fullscreen /><Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(240,244,248,0.95)' }} /></>; })()}
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
          <MobileLogo />

          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: { xs: '2rem', md: '2.2rem' }, fontWeight: 600, color: B.text, lineHeight: 1.15, mb: 0.75 }}>
              Check Application
            </Typography>
            <Typography sx={{ fontFamily: FF, fontSize: '0.88rem', color: B.muted }}>
              Enter your National ID or Application ID to view your status
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px', fontFamily: FF, fontSize: '0.82rem' }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Option A */}
            <Box sx={{ p: 2, borderRadius: '10px', border: `1.5px solid ${nationalId ? B.accent : B.border}`, bgcolor: nationalId ? B.brandLt : B.white, transition: 'all 0.2s' }}>
              <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.68rem', color: nationalId ? B.accent : B.muted, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Option A — National ID
              </Typography>
              <TextField
                label="SA National ID Number"
                value={nationalId}
                onChange={e => { setNationalId(e.target.value); if (e.target.value) setApplicationId(''); setError(''); }}
                fullWidth size="small"
                placeholder="e.g. 0001010123456"
                InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlinedIcon sx={{ color: nationalId ? B.accent : B.muted, fontSize: 18 }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Box>

            {/* Divider */}
            <Divider sx={{ borderColor: B.border }}>
              <Typography sx={{ fontFamily: FF, fontSize: '0.72rem', fontWeight: 600, color: B.mutedLt, px: 1 }}>OR</Typography>
            </Divider>

            {/* Option B */}
            <Box sx={{ p: 2, borderRadius: '10px', border: `1.5px solid ${applicationId ? B.accent : B.border}`, bgcolor: applicationId ? B.brandLt : B.white, transition: 'all 0.2s' }}>
              <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.68rem', color: applicationId ? B.accent : B.muted, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Option B — Application ID
              </Typography>
              <TextField
                label="Application Reference ID"
                value={applicationId}
                onChange={e => { setApplicationId(e.target.value); if (e.target.value) setNationalId(''); setError(''); }}
                fullWidth size="small"
                placeholder="Enter your reference number"
                InputProps={{ startAdornment: <InputAdornment position="start"><ConfirmationNumberOutlinedIcon sx={{ color: applicationId ? B.accent : B.muted, fontSize: 18 }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Box>

            <Button
              type="submit" variant="contained" fullWidth
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontFamily: FF, fontWeight: 700, fontSize: '0.9rem',
                textTransform: 'none',
                bgcolor: B.brand, color: '#fff',
                py: 1.4, borderRadius: '8px', boxShadow: 'none',
                '&:hover': { bgcolor: B.brandDk, boxShadow: '0 4px 16px rgba(26,53,87,0.25)' },
              }}
            >
              View My Application
            </Button>
          </Box>

          {/* Other portals */}
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3, borderColor: B.border }}>
              <Typography sx={{ fontFamily: FF, fontSize: '0.72rem', color: B.mutedLt, px: 1 }}>Other portals</Typography>
            </Divider>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Apply to a school',   sub: 'Start a new application',   path: '/' },
                { label: 'Student Portal',      sub: 'Sign in as a student',       path: '/student-login' },
                { label: 'Parent Portal',       sub: 'Sign in as a parent',        path: '/parent-login' },
                { label: 'Teacher / Admin',     sub: 'Staff portal access',        path: '/login' },
              ].map(link => (
                <Box key={link.path} onClick={() => navigate(link.path)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: '8px', cursor: 'pointer', border: `1px solid ${B.border}`, bgcolor: B.white, transition: 'all 0.15s', '&:hover': { borderColor: B.accent, bgcolor: B.brandLt } }}>
                  <Box>
                    <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.82rem', color: B.text }}>{link.label}</Typography>
                    <Typography sx={{ fontFamily: FF, fontSize: '0.7rem', color: B.muted }}>{link.sub}</Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ fontSize: 16, color: B.muted }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}