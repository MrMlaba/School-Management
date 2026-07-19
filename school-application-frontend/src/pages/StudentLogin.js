import API_BASE from '../config';
// src/pages/StudentLogin.js — Student Login
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress,
} from '@mui/material';
import BadgeOutlinedIcon         from '@mui/icons-material/BadgeOutlined';
import LockOutlinedIcon          from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon    from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { LoginShell, MobileLogo, B, FF, inputSx } from '../components/LoginLayout';

const LEFT = {
  tagline:  'Education, simplified.',
  features: [
    'Secure access to your account',
    'Digital records at your fingertips',
    'Real-time updates and notifications',
    'Your data, always protected',
  ],
};

export default function StudentLogin() {
  const navigate = useNavigate();
  const [studentNumber, setStudentNumber] = useState('');
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!studentNumber || !password) return setError('Student number and password are required');
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_BASE}/api/student-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNumber, password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('studentToken', data.token);
        if (data.tempPasswordFlag) {
          navigate('/student/change-password');
        } else {
          navigate('/student-dashboard');
        }
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Network error. Please try again.');
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
          Welcome Back
        </Typography>
        <Typography sx={{ fontFamily: FF, fontSize: '0.88rem', color: B.muted }}>
          Enter your credentials to continue
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px', fontFamily: FF, fontSize: '0.82rem' }}>{error}</Alert>}

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Student Number" value={studentNumber} size="small" fullWidth
          autoComplete="username"
          placeholder="e.g. STU2025001"
          onChange={e => setStudentNumber(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlinedIcon sx={{ color: B.muted, fontSize: 18 }} /></InputAdornment> }}
          sx={inputSx}
        />
        <TextField
          label="Password" type={showPass ? 'text' : 'password'}
          value={password} size="small" fullWidth
          autoComplete="current-password"
          onChange={e => setPassword(e.target.value)}
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

        {/* Forgot password hint */}
        <Typography sx={{ fontFamily: FF, fontSize: '0.75rem', color: B.muted, textAlign: 'right', mt: -0.5 }}>
          Forgot your password? Contact your school admin.
        </Typography>

        <Button
          type="submit" variant="contained" fullWidth disabled={loading}
          sx={{
            fontFamily: FF, fontWeight: 700, fontSize: '0.9rem',
            textTransform: 'none',
            bgcolor: B.brand, color: '#fff',
            py: 1.4, borderRadius: '8px', boxShadow: 'none',
            '&:hover': { bgcolor: B.brandDk, boxShadow: '0 4px 16px rgba(26,53,87,0.25)' },
            '&.Mui-disabled': { bgcolor: '#B0BEC5', color: '#fff' },
          }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign In'}
        </Button>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography
          onClick={() => navigate('/login-applicant')}
          sx={{ fontFamily: FF, fontSize: '0.78rem', color: B.muted, cursor: 'pointer', '&:hover': { color: B.accent } }}
        >
          Check application status
        </Typography>
      </Box>
    </LoginShell>
  );
}