// src/pages/ParentLoginPage.js — Parent Portal Login
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress,
} from '@mui/material';
import PersonOutlineIcon         from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon          from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon    from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { LoginShell, MobileLogo, B, FF, inputSx } from '../components/LoginLayout';
import API_BASE from '../config';

const LEFT = {
  tagline:  'Education, simplified.',
  features: [
    'Secure access to your account',
    'Digital records at your fingertips',
    'Real-time updates and notifications',
    'Your data, always protected',
  ],
};

export default function ParentLoginPage() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [showPass,setShowPass]= useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.username || !form.password) return setError('Username and password are required');
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_BASE}/api/parent-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('parentToken',     data.token);
        sessionStorage.setItem('parentFirstName', data.parent.firstName);
        sessionStorage.setItem('parentLastName',  data.parent.lastName);
        navigate('/parent/dashboard');
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
          label="Username" value={form.username} size="small" fullWidth
          autoComplete="username"
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon sx={{ color: B.muted, fontSize: 18 }} /></InputAdornment> }}
          sx={inputSx}
        />
        <TextField
          label="Password" type={showPass ? 'text' : 'password'}
          value={form.password} size="small" fullWidth
          autoComplete="current-password"
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
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
