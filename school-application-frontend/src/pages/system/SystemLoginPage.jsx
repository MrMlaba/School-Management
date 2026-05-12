import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, CircularProgress,
  InputAdornment, IconButton, GlobalStyles,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import VisibilityOffIcon  from '@mui/icons-material/VisibilityOff';

// ── Constants defined OUTSIDE component — never recreated on render ───────────
const FONT = "'IBM Plex Sans', sans-serif";
const BLUE = '#38bdf8';

// fieldSx defined outside — stable object, never triggers unnecessary re-renders
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONT, fontSize: '0.9rem', borderRadius: '7px',
    backgroundColor: '#ffffff !important',
    '& fieldset':             { borderColor: '#e2e8f0' },
    '&:hover fieldset':       { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
  // Force dark text — prevents white-on-white in dark MUI theme
  '& .MuiInputBase-input': {
    color: '#1e293b !important',
    fontFamily: FONT,
    '&:-webkit-autofill': {
      WebkitTextFillColor: '#1e293b',
      WebkitBoxShadow: '0 0 0 1000px #ffffff inset',
    },
  },
  '& .MuiInputLabel-root':            { fontFamily: FONT, fontSize: '0.9rem', color: '#94a3b8' },
  '& .MuiInputLabel-root.Mui-focused':{ color: BLUE },
  '& .MuiFormHelperText-root':        { fontFamily: FONT, fontSize: '0.72rem', ml: 0 },
};

// ── Font import via GlobalStyles — injected once, never on re-render ──────────
// Using <style> tags inside a component re-injects on every keystroke,
// causing browser reflow that steals input focus. GlobalStyles avoids this.
const FontImport = () => (
  <GlobalStyles styles="@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');" />
);

// ── Component ─────────────────────────────────────────────────────────────────
const SystemLoginPage = () => {
  const navigate = useNavigate();

  // Separate state vars — avoids object spread on every keystroke
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (localStorage.getItem('systemToken')) navigate('/system/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Both fields are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('http://localhost:5005/api/system/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('systemToken',    data.token);
        localStorage.setItem('systemUsername', data.username);
        navigate('/system/dashboard');
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch {
      setError('Cannot reach server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FontImport />

      <Box sx={{
        minHeight: '100vh',
        bgcolor: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: 2,
        backgroundImage: `
          linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}>
        <Box sx={{
          width: '100%', maxWidth: 400,
          bgcolor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}>

          {/* ── Header ── */}
          <Box sx={{
            px: 3, py: 2.5, bgcolor: '#0f172a',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '9px',
              bgcolor: BLUE, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldOutlinedIcon sx={{ fontSize: 20, color: '#000' }} />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                System Administration
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                Authorised access only
              </Typography>
            </Box>
          </Box>

          {/* ── Form ── */}
          <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, py: 3, bgcolor: '#ffffff' }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '1.1rem', color: '#0f172a', mb: 0.5 }}>
              Sign in
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#94a3b8', mb: 2.5 }}>
              Enter your system administrator credentials
            </Typography>

            <TextField
              label="Username" fullWidth size="small"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              sx={{ ...fieldSx, mb: 1.75 }}
            />

            <TextField
              label="Password" fullWidth size="small"
              autoComplete="current-password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              sx={{ ...fieldSx, mb: 2.5 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(p => !p)} edge="end"
                      sx={{ color: '#94a3b8' }}>
                      {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Box sx={{
                mb: 2, px: 1.5, py: 1.1,
                bgcolor: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '7px',
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#dc2626', fontWeight: 500 }}>
                  {error}
                </Typography>
              </Box>
            )}

            <Button type="submit" fullWidth variant="contained" disabled={loading}
              sx={{
                fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem',
                textTransform: 'none', py: 1.1, borderRadius: '7px',
                bgcolor: BLUE, color: '#000', boxShadow: 'none',
                '&:hover':    { bgcolor: '#7dd3fc', boxShadow: 'none' },
                '&:disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
              }}>
              {loading ? <CircularProgress size={18} sx={{ color: '#000' }} /> : 'Sign In'}
            </Button>

            <Typography sx={{
              fontFamily: FONT, fontSize: '0.68rem',
              color: '#94a3b8', textAlign: 'center', mt: 2,
            }}>
              This portal is not publicly linked. Access is restricted.
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default SystemLoginPage;