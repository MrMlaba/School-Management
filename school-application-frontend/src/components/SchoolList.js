import React, { useState, useEffect } from 'react';
import { Grid, Typography, CircularProgress, Box } from '@mui/material';
import SchoolCard from './SchoolCard';
import SchoolDetailModal from './SchoolDetailModal';

const SchoolList = ({ bodyFont, displayFont }) => {
  const [schools, setSchools]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);

  const BODY    = bodyFont    || "'Outfit', sans-serif";
  const DISPLAY = displayFont || "'Cormorant Garamond', serif";

  useEffect(() => {
    fetch('https://school-management-production-6167.up.railway.app/api/schools')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load schools');
        return res.json();
      })
      .then((data) => setSchools(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleViewDetails = (school) => {
    setSelectedSchool(school);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
        <CircularProgress sx={{ color: '#e8a020' }} size={36} thickness={3} />
        <Typography sx={{ fontFamily: BODY, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          Loading schools…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 4,
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '3px',
        }}
      >
        <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.5rem', color: 'rgba(255,255,255,0.6)', mb: 1 }}>
          Could not load schools
        </Typography>
        <Typography sx={{ fontFamily: BODY, color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  if (schools.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)' }}>
          No schools available at this time.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {schools.map((school) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={school.id}>
            <SchoolCard school={school} onViewDetails={handleViewDetails} />
          </Grid>
        ))}
      </Grid>

      <SchoolDetailModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedSchool(null); }}
        school={selectedSchool}
      />
    </>
  );
};

export default SchoolList;



