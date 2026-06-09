// src/pages/LoginPage.js — Admin Login
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, Divider,
} from '@mui/material';
import PersonOutlineIcon         from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon          from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon    from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardIcon          from '@mui/icons-material/ArrowForward';
import { LoginShell, MobileLogo, B, FF, inputSx } from '../components/LoginLayout';

const LEFT = {
  badge:    'Admin Portal',
  tagline:  'Manage your school with confidence.',
  features: [
    'Student enrolment & records',
    'Teacher management & timetables',
    'Applications & document uploads',
    'PDF report cards & analytics',
  ],
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('https://school-management-production-6167.up.railway.app/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('adminToken',  data.token);
        sessionStorage.setItem('adminSchool', data.school);
        sessionStorage.setItem('adminName',   data.name || username);
        navigate('/admin');
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginShell leftProps={LEFT}>
      <MobileLogo />

      {/* Heading */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: { xs: '2rem', md: '2.2rem' }, fontWeight: 600, color: B.text, lineHeight: 1.15, mb: 0.75 }}>
          Admin Sign In
        </Typography>
        <Typography sx={{ fontFamily: FF, fontSize: '0.88rem', color: B.muted }}>
          Sign in to access the school management portal
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px', fontFamily: FF, fontSize: '0.82rem' }}>{error}</Alert>}

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Username" value={username} onChange={e => setUsername(e.target.value)}
          required fullWidth size="small" autoComplete="username"
          InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon sx={{ color: B.muted, fontSize: 18 }} /></InputAdornment> }}
          sx={inputSx}
        />
        <TextField
          label="Password" type={showPass ? 'text' : 'password'}
          value={password} onChange={e => setPassword(e.target.value)}
          required fullWidth size="small" autoComplete="current-password"
          InputProps={{
            startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ color: B.muted, fontSize: 18 }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPass(s => !s)} edge="end" size="small">
                  {showPass
                    ? <VisibilityOffOutlinedIcon sx={{ color: B.muted, fontSize: 17 }} />
                    : <VisibilityOutlinedIcon   sx={{ color: B.muted, fontSize: 17 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={inputSx}
        />

        <Button
          type="submit" variant="contained" fullWidth disabled={loading}
          sx={{
            fontFamily: FF, fontWeight: 700, fontSize: '0.9rem',
            textTransform: 'none', mt: 0.5,
            bgcolor: B.brand, color: '#fff',
            py: 1.4, borderRadius: '8px', boxShadow: 'none',
            '&:hover': { bgcolor: B.brandDk, boxShadow: '0 4px 16px rgba(26,53,87,0.25)' },
            '&.Mui-disabled': { bgcolor: '#B0BEC5', color: '#fff' },
          }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign In'}
        </Button>
      </Box>

      {/* Other portals */}
      <Box sx={{ mt: 4 }}>
        <Divider sx={{ mb: 3, borderColor: B.border }}>
          <Typography sx={{ fontFamily: FF, fontSize: '0.72rem', color: B.mutedLt, px: 1 }}>Other portals</Typography>
        </Divider>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[
            { label: 'Teacher Portal',            sub: 'Sign in as a teacher',          path: '/teacher-login' },
            { label: 'Student Portal',            sub: 'Sign in as a student',          path: '/student-login' },
            { label: 'Check Application Status',  sub: 'Track your school application', path: '/login-applicant' },
          ].map(link => (
            <Box
              key={link.path}
              onClick={() => navigate(link.path)}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                p: 1.5, borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${B.border}`, bgcolor: B.white,
                transition: 'all 0.15s',
                '&:hover': { borderColor: B.accent, bgcolor: B.brandLt },
              }}
            >
              <Box>
                <Typography sx={{ fontFamily: FF, fontWeight: 600, fontSize: '0.82rem', color: B.text }}>{link.label}</Typography>
                <Typography sx={{ fontFamily: FF, fontSize: '0.7rem', color: B.muted }}>{link.sub}</Typography>
              </Box>
              <ArrowForwardIcon sx={{ fontSize: 16, color: B.muted }} />
            </Box>
          ))}
        </Box>
      </Box>
    </LoginShell>
  );
}