import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, InputAdornment,
  IconButton, Alert, CircularProgress,
} from '@mui/material';
import PersonOutlineIcon      from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon       from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import SchoolIcon             from '@mui/icons-material/School';
import BackgroundSlideshow    from '../components/BackgroundSlideshow';

const G = {
  green:   '#059669',
  greenDk: '#047857',
  greenLt: '#D1FAE5',
  ink:     '#0F1F1A',
  muted:   '#4B6860',
  border:  '#D1E8E0',
  paper:   '#FFFFFF',
  paper2:  '#F4FAF7',
  error:   '#DC2626',
  errorLt: '#FEE2E2',
};

const useLoginFonts = () => {
  useEffect(() => {
    if (document.getElementById('login-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'login-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const BF = "'DM Sans', sans-serif";
const DF = "'DM Serif Display', Georgia, serif";

export default function LoginPage() {
  useLoginFonts();
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('https://school-management-production-6167.up.railway.app/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken',  data.token);
        localStorage.setItem('adminSchool', data.school);
        localStorage.setItem('adminName',   data.name || username);
        navigate('/admin');
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      fontFamily: BF,
      bgcolor: G.paper,
      '& fieldset': { borderColor: G.border },
      '&:hover fieldset': { borderColor: G.green },
      '&.Mui-focused fieldset': { borderColor: G.green, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root': { fontFamily: BF, color: G.muted },
    '& .MuiInputLabel-root.Mui-focused': { color: G.green },
    '& .MuiInputBase-input': { fontFamily: BF, color: G.ink, fontSize: '0.95rem' },
  };

  return (
    <Box sx={{
      minHeight: '100svh', display: 'flex',
      fontFamily: BF, position: 'relative', overflow: 'hidden',
    }}>
      {/* Left panel — background slideshow — desktop only */}
      <Box sx={{
        display: { xs: 'none', md: 'block' },
        width: '48%', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <BackgroundSlideshow fullscreen />
        </Box>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(5,150,105,0.7) 0%, rgba(15,31,26,0.75) 100%)',
        }} />
        {/* Overlay content */}
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', px: 6, py: 6, zIndex: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              bgcolor: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontFamily: BF, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              School Management System
            </Typography>
          </Box>
          <Typography sx={{
            fontFamily: DF, fontSize: '2.8rem', color: '#fff',
            lineHeight: 1.1, mb: 2.5,
          }}>
            Managing<br />
            <Box component="span" sx={{ color: '#6EE7B7', fontStyle: 'italic' }}>schools made</Box><br />
            simple.
          </Typography>
          <Typography sx={{ fontFamily: BF, fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, maxWidth: 340 }}>
            The complete platform for student applications, enrolment, assessments, and reports across KwaZulu-Natal.
          </Typography>
          {/* Feature dots */}
          <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {['Student & teacher management', 'Digital report cards & PDF export', 'AI-powered quiz generator'].map(f => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#6EE7B7', flexShrink: 0 }} />
                <Typography sx={{ fontFamily: BF, fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>{f}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel — login form */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        bgcolor: G.paper2,
        px: { xs: 3, sm: 5, md: 6 },
        py: { xs: 4, md: 6 },
        position: 'relative',
      }}>
        {/* Mobile background */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'absolute', inset: 0, zIndex: 0 }}>
          <BackgroundSlideshow fullscreen />
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(244,250,247,0.94)' }} />
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Logo — mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontFamily: BF, fontWeight: 700, fontSize: '0.95rem', color: G.ink }}>
              School Management System
            </Typography>
          </Box>

          {/* Heading */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontFamily: DF, fontSize: { xs: '2rem', md: '2.4rem' }, color: G.ink, lineHeight: 1.1, mb: 1 }}>
              Admin Sign In
            </Typography>
            <Typography sx={{ fontFamily: BF, fontSize: '0.9rem', color: G.muted }}>
              Enter your credentials to access the management portal
            </Typography>
          </Box>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px', fontFamily: BF, fontSize: '0.85rem' }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required fullWidth
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ color: G.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={inputSx}
            />
            <TextField
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required fullWidth
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: G.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(s => !s)} edge="end" size="small">
                      {showPass
                        ? <VisibilityOffOutlinedIcon sx={{ color: G.muted, fontSize: 18 }} />
                        : <VisibilityOutlinedIcon   sx={{ color: G.muted, fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={inputSx}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                fontFamily: BF, fontWeight: 700, fontSize: '0.95rem',
                textTransform: 'none',
                bgcolor: G.green, color: '#fff',
                py: 1.6, borderRadius: '8px', mt: 0.5,
                boxShadow: `0 4px 16px rgba(5,150,105,0.3)`,
                '&:hover': { bgcolor: G.greenDk, boxShadow: `0 6px 20px rgba(5,150,105,0.4)` },
                '&.Mui-disabled': { bgcolor: '#A7F3D0', color: '#fff' },
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </Box>

          {/* Links */}
          <Box sx={{ mt: 4, pt: 4, borderTop: `1px solid ${G.border}`, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              { label: 'Teacher Portal', path: '/teacher-login', desc: 'Log in as a teacher' },
              { label: 'Student Portal', path: '/student-login', desc: 'Log in as a student' },
              { label: 'Check Application Status', path: '/login-applicant', desc: 'Track your admission' },
            ].map(link => (
              <Box
                key={link.path}
                onClick={() => navigate(link.path)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 1.5, borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${G.border}`, bgcolor: G.paper,
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: G.green, bgcolor: G.greenLt },
                }}
              >
                <Box>
                  <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.85rem', color: G.ink }}>{link.label}</Typography>
                  <Typography sx={{ fontFamily: BF, fontSize: '0.72rem', color: G.muted }}>{link.desc}</Typography>
                </Box>
                <Box sx={{ color: G.green, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ fontSize: 18, color: G.green }}>›</Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}