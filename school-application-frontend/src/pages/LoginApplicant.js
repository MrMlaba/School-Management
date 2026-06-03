import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography,
  InputAdornment, Alert, Divider,
} from '@mui/material';
import BadgeOutlinedIcon      from '@mui/icons-material/BadgeOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ArrowForwardIcon       from '@mui/icons-material/ArrowForward';
import SchoolIcon             from '@mui/icons-material/School';
import SearchIcon             from '@mui/icons-material/Search';
import BackgroundSlideshow    from '../components/BackgroundSlideshow';

const G = {
  green:   '#059669',
  greenDk: '#047857',
  greenLt: '#D1FAE5',
  greenMd: '#6EE7B7',
  ink:     '#0F1F1A',
  ink2:    '#1F3329',
  muted:   '#4B6860',
  border:  '#D1E8E0',
  paper:   '#FFFFFF',
  paper2:  '#F4FAF7',
  paper3:  '#EAF5EF',
};

const BF = "'DM Sans', sans-serif";
const DF = "'DM Serif Display', Georgia, serif";

const useFonts = () => {
  useEffect(() => {
    if (document.getElementById('login-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'login-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

export default function LoginApplicant() {
  useFonts();
  const [nationalId,     setNationalId]     = useState('');
  const [applicationId,  setApplicationId]  = useState('');
  const [error,          setError]          = useState('');
  const navigate = useNavigate();

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
    <Box sx={{ minHeight: '100svh', display: 'flex', fontFamily: BF, position: 'relative', overflow: 'hidden' }}>

      {/* Left panel — background — desktop only */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, width: '48%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <BackgroundSlideshow fullscreen />
        </Box>
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,150,105,0.65) 0%, rgba(15,31,26,0.8) 100%)' }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 6, py: 6, zIndex: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontFamily: BF, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              School Application System
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: DF, fontSize: '2.8rem', color: '#fff', lineHeight: 1.1, mb: 2.5 }}>
            Track your<br />
            <Box component="span" sx={{ color: '#6EE7B7', fontStyle: 'italic' }}>application</Box><br />
            anytime.
          </Typography>
          <Typography sx={{ fontFamily: BF, fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, maxWidth: 340 }}>
            Check your admission status, view school decisions, and manage your application in one place.
          </Typography>
          {/* Status steps */}
          <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Application submitted',     done: true  },
              { label: 'Under review by school',    done: false },
              { label: 'Decision & offer letter',   done: false },
              { label: 'Enrolment confirmation',    done: false },
            ].map((step, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <Box sx={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: step.done ? G.green : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${step.done ? G.green : 'rgba(255,255,255,0.2)'}`,
                }}>
                  {step.done
                    ? <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />
                    : <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.3)' }} />
                  }
                </Box>
                <Typography sx={{ fontFamily: BF, fontSize: '0.85rem', color: step.done ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: step.done ? 600 : 400 }}>
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel — form */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        bgcolor: G.paper2,
        px: { xs: 3, sm: 5, md: 6 },
        py: { xs: 4, md: 6 },
        position: 'relative',
      }}>
        {/* Mobile bg */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'absolute', inset: 0, zIndex: 0 }}>
          <BackgroundSlideshow fullscreen />
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(244,250,247,0.94)' }} />
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontFamily: BF, fontWeight: 700, fontSize: '0.95rem', color: G.ink }}>
              School Application System
            </Typography>
          </Box>

          {/* Icon & heading */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '12px', bgcolor: G.paper3, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
              <SearchIcon sx={{ color: G.green, fontSize: 26 }} />
            </Box>
            <Typography sx={{ fontFamily: DF, fontSize: { xs: '2rem', md: '2.4rem' }, color: G.ink, lineHeight: 1.1, mb: 1 }}>
              Check Application
            </Typography>
            <Typography sx={{ fontFamily: BF, fontSize: '0.9rem', color: G.muted, lineHeight: 1.6 }}>
              Enter your National ID or Application ID to view your admission status
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px', fontFamily: BF, fontSize: '0.85rem' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Option A */}
            <Box sx={{ p: 2.5, borderRadius: '10px', border: `1.5px solid ${nationalId ? G.green : G.border}`, bgcolor: nationalId ? G.paper3 : G.paper, transition: 'all 0.2s' }}>
              <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.78rem', color: G.muted, mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Option A
              </Typography>
              <TextField
                label="South African National ID"
                value={nationalId}
                onChange={e => { setNationalId(e.target.value); if (e.target.value) setApplicationId(''); setError(''); }}
                fullWidth
                placeholder="e.g. 0001010123456"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeOutlinedIcon sx={{ color: nationalId ? G.green : G.muted, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
            </Box>

            {/* Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Divider sx={{ flex: 1, borderColor: G.border }} />
              <Typography sx={{ fontFamily: BF, fontSize: '0.78rem', fontWeight: 600, color: G.muted, px: 1 }}>OR</Typography>
              <Divider sx={{ flex: 1, borderColor: G.border }} />
            </Box>

            {/* Option B */}
            <Box sx={{ p: 2.5, borderRadius: '10px', border: `1.5px solid ${applicationId ? G.green : G.border}`, bgcolor: applicationId ? G.paper3 : G.paper, transition: 'all 0.2s' }}>
              <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.78rem', color: G.muted, mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Option B
              </Typography>
              <TextField
                label="Application ID"
                value={applicationId}
                onChange={e => { setApplicationId(e.target.value); if (e.target.value) setNationalId(''); setError(''); }}
                fullWidth
                placeholder="Enter your application reference"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ConfirmationNumberOutlinedIcon sx={{ color: applicationId ? G.green : G.muted, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontFamily: BF, fontWeight: 700, fontSize: '0.95rem',
                textTransform: 'none',
                bgcolor: G.green, color: '#fff',
                py: 1.6, borderRadius: '8px', mt: 0.5,
                boxShadow: `0 4px 16px rgba(5,150,105,0.3)`,
                '&:hover': { bgcolor: G.greenDk, boxShadow: `0 6px 20px rgba(5,150,105,0.4)` },
              }}
            >
              View My Application
            </Button>
          </Box>

          {/* Back / other links */}
          <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${G.border}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              onClick={() => navigate('/')}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: '8px', cursor: 'pointer', border: `1px solid ${G.border}`, bgcolor: G.paper, '&:hover': { borderColor: G.green, bgcolor: G.greenLt } }}
            >
              <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.85rem', color: G.ink }}>Apply to a school</Typography>
              <Typography sx={{ color: G.green }}>›</Typography>
            </Box>
            <Box
              onClick={() => navigate('/login')}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: '8px', cursor: 'pointer', border: `1px solid ${G.border}`, bgcolor: G.paper, '&:hover': { borderColor: G.green, bgcolor: G.greenLt } }}
            >
              <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.85rem', color: G.ink }}>Admin / Staff portal</Typography>
              <Typography sx={{ color: G.green }}>›</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}