import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import API_BASE from '../config';

const T = {
  ink:    '#0F1F1A',
  ink3:   '#4B6860',
  ink4:   '#7A9E95',
  paper:  '#FFFFFF',
  paper2: '#F4FAF7',
  paper3: '#EAF5EF',
  green:  '#059669',
  red:    '#DC2626',
  redL:   '#FEE2E2',
  border: '#D1E8E0',
};

const BASE = API_BASE;

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.green },
    '&.Mui-focused fieldset': { borderColor: T.green },
  },
  '& .MuiInputLabel-root': { fontFamily: "'Plus Jakarta Sans', sans-serif" },
  '& .MuiFormHelperText-root': { fontFamily: "'Plus Jakarta Sans', sans-serif" },
};

const StudentChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const token = sessionStorage.getItem('studentToken');
    if (!token) { setError('Not authenticated'); setLoading(false); return; }
    try {
      const res = await fetch(`${BASE}/api/student/change-password`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        navigate('/student-dashboard');
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100dvh',
      background: T.paper2, fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <Box sx={{
        width: '100%', maxWidth: 420, background: T.paper, borderRadius: '18px',
        border: `1px solid ${T.border}`, boxShadow: '0 4px 20px rgba(15,31,26,0.08)', p: { xs: 3, sm: 4 },
      }}>
        <Box sx={{
          width: 52, height: 52, borderRadius: '14px', background: T.paper3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5,
        }}>
          <LockOutlinedIcon sx={{ color: T.green, fontSize: 26 }} />
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: '1.35rem', color: T.ink, fontFamily: "'Fraunces', serif" }}>
          Change Password
        </Typography>
        <Typography sx={{ color: T.ink3, fontSize: '0.88rem', mt: 0.75, mb: 3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          You must set a new password before continuing.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            sx={inputSx}
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            helperText="Minimum 6 characters"
            inputProps={{ minLength: 6 }}
            sx={inputSx}
          />

          {error && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, p: 1.25,
              borderRadius: '8px', background: T.redL,
            }}>
              <ErrorOutlineIcon sx={{ fontSize: 17, color: T.red, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.82rem', color: T.red, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {error}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1.25, mt: 3 }}>
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
              sx={{
                background: T.green, textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: 'none', px: 2.5, py: 1,
                '&:hover': { background: '#047857' },
              }}
            >
              {loading ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/student-dashboard')}
              disabled={loading}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: T.ink3,
                borderColor: T.border, fontFamily: "'Plus Jakarta Sans', sans-serif", px: 2.5, py: 1,
                '&:hover': { borderColor: T.ink4, background: T.paper3 },
              }}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

export default StudentChangePassword;
