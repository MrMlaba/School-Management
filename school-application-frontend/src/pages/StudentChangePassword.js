import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';

const StudentChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ── Client-side minimum-length guard (mirrors server: 6 chars) ──────────
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const token = localStorage.getItem('studentToken');
    if (!token) { setError('Not authenticated'); setLoading(false); return; }
    try {
      const res = await fetch('http://localhost:5005/api/student/change-password', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/student-dashboard');
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Card sx={{ width: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Change Password</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              You must set a new password before continuing.
            </Typography>
            <form onSubmit={handleSubmit}>
              {/* FIX: added required */}
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                fullWidth
                margin="normal"
                required
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
              />
              {error && (
                <Typography color="error" sx={{ mt: 1, fontSize: '0.875rem' }}>
                  {error}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="contained" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/student-dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default StudentChangePassword;