import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import EastIcon from '@mui/icons-material/East';
import { useNavigate } from 'react-router-dom';

const DISPLAY_FONT = "'Cormorant Garamond', Georgia, serif";
const BODY_FONT    = "'Outfit', sans-serif";

const SchoolCard = ({ school, onViewDetails }) => {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      elevation={0}
      sx={{
        position: 'relative',
        height: 310,
        borderRadius: '3px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'transform 0.35s ease, box-shadow 0.35s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,160,32,0.3)'
          : '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onClick={() => onViewDetails && onViewDetails(school)}
    >
      {/* Image */}
      <CardMedia
        component="img"
        image={school.image || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80'}
        alt={school.name}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.5s ease',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
        }}
      />

      {/* Always-visible gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: hovered
            ? 'linear-gradient(to top, rgba(5,10,25,0.97) 40%, rgba(5,10,25,0.3) 100%)'
            : 'linear-gradient(to top, rgba(5,10,25,0.88) 30%, rgba(5,10,25,0.1) 100%)',
          transition: 'background 0.35s ease',
        }}
      />

      {/* Top-left accent line */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0,
          width: hovered ? 50 : 30,
          height: 3,
          bgcolor: '#e8a020',
          transition: 'width 0.4s ease',
        }}
      />

      {/* School index badge */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 32,
          height: 32,
          borderRadius: '2px',
          bgcolor: 'rgba(232,160,32,0.15)',
          border: '1px solid rgba(232,160,32,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LocationOnOutlinedIcon sx={{ fontSize: 16, color: '#e8c06a' }} />
      </Box>

      {/* Content always visible at bottom */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2.5,
        }}
      >
        {/* Location */}
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontWeight: 400,
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            mb: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <LocationOnOutlinedIcon sx={{ fontSize: 13 }} />
          {school.location || 'KwaZulu-Natal'}
        </Typography>

        {/* School name */}
        <Typography
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 600,
            fontSize: '1.5rem',
            color: 'white',
            lineHeight: 1.2,
            mb: hovered ? 2 : 0,
            transition: 'margin 0.3s ease',
          }}
        >
          {school.name}
        </Typography>

        {/* Hover-reveal content */}
        <Box
          sx={{
            overflow: 'hidden',
            maxHeight: hovered ? 120 : 0,
            opacity: hovered ? 1 : 0,
            transition: 'max-height 0.4s ease, opacity 0.3s ease',
          }}
        >
          {school.grades && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
              {(Array.isArray(school.grades) ? school.grades : [school.grades]).map((g) => (
                <Chip
                  key={g}
                  label={g}
                  size="small"
                  sx={{
                    fontFamily: BODY_FONT,
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    height: 22,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.8)',
                  }}
                />
              ))}
            </Box>
          )}

          <Button
            variant="contained"
            size="small"
            endIcon={<EastIcon sx={{ fontSize: '14px !important' }} />}
            onClick={(e) => { e.stopPropagation(); navigate('/apply'); }}
            sx={{
              fontFamily: BODY_FONT,
              fontWeight: 600,
              fontSize: '0.78rem',
              textTransform: 'none',
              px: 2.5,
              py: 0.8,
              borderRadius: '2px',
              bgcolor: '#e8a020',
              color: '#0a0e1a',
              '&:hover': { bgcolor: '#f0b030' },
              boxShadow: 'none',
            }}
          >
            Apply to this school
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

export default SchoolCard;

