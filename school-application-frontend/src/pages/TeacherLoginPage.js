import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';

const C = {
  brand: '#1A3557', border: '#D0D7DE',
  text: '#1A2332', muted: '#6B7C93', white: '#FFFFFF',
};

const TeacherLoginPage = () => {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.username || !form.password)
      return setError('Username and password are required');
    setLoading(true); setError('');
    try {
      const res  = await fetch('%REACT_APP_API_URL%/api/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('teacherToken',     data.token);
        localStorage.setItem('teacherFirstName', data.teacher.firstName);
        localStorage.setItem('teacherLastName',  data.teacher.lastName);
        localStorage.setItem('teacherSchool',    data.teacher.school);
        navigate('/teacher/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', background: '#F0F4F8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <Box sx={{
        width: '100%', maxWidth: 400,
        background: C.white, border: `1px solid ${C.border}`,
        borderRadius: '12px', p: 4,
        boxShadow: '0 4px 24px rgba(15,31,61,0.08)',
      }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SchoolIcon sx={{ color: C.white, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.2 }}>
              Teacher Portal
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Sign in to your account
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: C.text, mb: 2.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Welcome back
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.82rem', borderRadius: '6px' }}>{error}</Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username" value={form.username} size="small" fullWidth
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <TextField
            label="Password" type="password" value={form.password} size="small" fullWidth
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Button
            variant="contained" fullWidth onClick={handleLogin} disabled={loading}
            sx={{
              background: C.brand, textTransform: 'none', fontWeight: 700,
              py: 1.25, borderRadius: '6px', boxShadow: 'none',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.95rem',
              '&:hover': { background: '#122740', boxShadow: 'none' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TeacherLoginPage;