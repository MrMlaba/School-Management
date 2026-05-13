import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import BackgroundSlideshow from '../components/BackgroundSlideshow';

const StudentLogin = () => {
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://school-management-production-6167.up.railway.app/api/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNumber, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('studentToken', data.token);
        if (data.tempPasswordFlag) {
          navigate('/student/change-password');
        } else {
          navigate('/student-dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundSlideshow>
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 3 }}>Student Login</Typography>
              <form onSubmit={handleSubmit}>
                <TextField label="Student Number" value={studentNumber} onChange={e=>setStudentNumber(e.target.value)} fullWidth margin="normal" required />
                <TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} fullWidth margin="normal" required />
                {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
                <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 3 }}>{loading ? 'Logging in...' : 'Login'}</Button>
              </form>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </BackgroundSlideshow>
  );
};

export default StudentLogin;





