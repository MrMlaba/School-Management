import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EastIcon from '@mui/icons-material/East';
import { useNavigate } from 'react-router-dom';

const DISPLAY_FONT = "'Cormorant Garamond', Georgia, serif";
const BODY_FONT    = "'Outfit', sans-serif";

const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
    <Box sx={{ color: '#2048e8', mt: 0.1, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.7rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
        {value || '—'}
      </Typography>
    </Box>
  </Box>
);

const SchoolDetailModal = ({ open, onClose, school }) => {
  const navigate = useNavigate();

  if (!school) return null;

  const grades = Array.isArray(school.grades)
    ? school.grades
    : school.grades
    ? [school.grades]
    : ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  const streams = school.streams || ['Physics', 'Commerce', 'Humanities'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(8, 12, 28, 0.97)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        },
      }}
    >
      {/* Image header */}
      <Box sx={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <Box
          component="img"
          src={school.image || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80'}
          alt={school.name}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(8,12,28,1) 0%, rgba(8,12,28,0.3) 60%, transparent 100%)',
          }}
        />
        {/* Gold top bar */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: '#e8a020' }} />

        {/* Close button */}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* School name overlaid on image */}
        <Box sx={{ position: 'absolute', bottom: 20, left: 24, right: 60 }}>
          <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.7rem', color: '#e8c06a', letterSpacing: '0.15em', textTransform: 'uppercase', mb: 0.5 }}>
            Partner Institution
          </Typography>
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: '2rem',
              color: 'white',
              lineHeight: 1.1,
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {school.name}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ px: 3, py: 3 }}>
        {/* Details grid */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <InfoRow icon={<LocationOnOutlinedIcon sx={{ fontSize: 18 }} />} label="Location" value={school.location} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoRow icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />} label="Contact" value={school.phone || school.contact} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoRow icon={<SchoolOutlinedIcon sx={{ fontSize: 18 }} />} label="School Type" value={school.type || 'Public School'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoRow icon={<MenuBookOutlinedIcon sx={{ fontSize: 18 }} />} label="Medium" value={school.medium || 'English'} />
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />

        {/* Available grades */}
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.72rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.25 }}>
            Available Grades
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {grades.map((g) => (
              <Chip
                key={g}
                label={g}
                size="small"
                sx={{
                  fontFamily: BODY_FONT,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  bgcolor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.75)',
                  borderRadius: '2px',
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Subject streams */}
        <Box>
          <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.72rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.25 }}>
            Subject Streams (Gr 10–12)
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {streams.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                sx={{
                  fontFamily: BODY_FONT,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  bgcolor: 'rgba(232,160,32,0.1)',
                  border: '1px solid rgba(32, 115, 232, 0.3)',
                  color: '#6aa5e8',
                  borderRadius: '2px',
                }}
              />
            ))}
          </Stack>
        </Box>

        {school.description && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 3 }} />
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontSize: '0.88rem',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.8,
                fontWeight: 300,
              }}
            >
              {school.description}
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            fontFamily: BODY_FONT,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'none',
            '&:hover': { color: 'white', bgcolor: 'transparent' },
          }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          endIcon={<EastIcon />}
          onClick={() => { onClose(); navigate('/apply'); }}
          sx={{
            fontFamily: BODY_FONT,
            fontWeight: 600,
            fontSize: '0.9rem',
            px: 3.5,
            py: 1,
            borderRadius: '2px',
            bgcolor: '#2063e8',
            color: '#0a0e1a',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#307df0', boxShadow: 'none' },
          }}
        >
          Apply to this School
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SchoolDetailModal;