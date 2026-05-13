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

const LoginApplicant = () => {
  const [nationalId, setNationalId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nationalId) {
      navigate(`/applicant-dashboard?nationalId=${encodeURIComponent(nationalId)}`);
    } else if (applicationId) {
      navigate(`/applicant-dashboard?applicationId=${encodeURIComponent(applicationId)}`);
    } else {
      setError('Please enter your National ID or Application ID.');
    }
  };

  return (
    <BackgroundSlideshow>
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <Card sx={{ 
            maxWidth: 400, 
            width: '100%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h5" 
                gutterBottom 
                align="center"
                sx={{ 
                  color: 'white', 
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                  mb: 3,
                }}
              >
                Applicant Login
              </Typography>
              <form onSubmit={handleSubmit}>
                <TextField
                  label="National ID"
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                  fullWidth
                  margin="normal"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.8)',
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                />
                <Typography 
                  align="center" 
                  sx={{ 
                    my: 2,
                    color: 'rgba(255, 255, 255, 0.8)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  or
                </Typography>
                <TextField
                  label="Application ID"
                  value={applicationId}
                  onChange={e => setApplicationId(e.target.value)}
                  fullWidth
                  margin="normal"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.8)',
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                />
                {error && (
                  <Typography 
                    color="error" 
                    sx={{ 
                      mt: 2,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    {error}
                  </Typography>
                )}
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  sx={{ 
                    mt: 3,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  View My Applications
                </Button>
              </form>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </BackgroundSlideshow>
  );
};

export default LoginApplicant; 




