import React, { useEffect, useRef, useState } from 'react';
import SchoolList from '../components/SchoolList';
import BackgroundSlideshow from '../components/BackgroundSlideshow';
import {
  Typography, Container, Box, Button, Grid, Stack, Divider, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EastIcon from '@mui/icons-material/East';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

// ── Fonts ──────────────────────────────────────────────────────────────────
const usePageFonts = () => {
  useEffect(() => {
    if (document.getElementById('home-page-fonts')) return;
    const link = document.createElement('link');
    link.id = 'home-page-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const DISPLAY_FONT = "'Merriweather', Georgia, serif";
const BODY_FONT = "'Source Sans 3', sans-serif";

// ── Animated counter ───────────────────────────────────────────────────────
const AnimatedNumber = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = Math.ceil(target / (1400 / 16));
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ── Stats ─────────────────────────────────────────────────────────────────
const STATS = [
  { icon: <SchoolOutlinedIcon />,        label: 'Partner Schools',    value: 15,   suffix: '+' },
  { icon: <GroupsOutlinedIcon />,        label: 'Applications Filed', value: 2400, suffix: '+' },
  { icon: <VerifiedOutlinedIcon />,      label: 'Acceptance Rate',    value: 87,   suffix: '%' },
  { icon: <CalendarMonthOutlinedIcon />, label: 'Years Running',      value: 8,    suffix: ''  },
];

// ── How it works ──────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    icon: <SchoolOutlinedIcon sx={{ fontSize: 28 }} />,
    title: 'Browse Schools',
    desc: 'Explore partner schools, their locations, available grades, and subject streams to find your ideal fit.',
  },
  {
    num: '02',
    icon: <DescriptionOutlinedIcon sx={{ fontSize: 28 }} />,
    title: 'Submit Application',
    desc: 'Complete your application online in minutes. Upload required documents and apply to multiple schools at once.',
  },
  {
    num: '03',
    icon: <TaskAltIcon sx={{ fontSize: 28 }} />,
    title: 'Track & Receive Offer',
    desc: 'Monitor your application status in real-time. Receive notifications when schools review your submission.',
  },
];

// ── Section label ─────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Typography
    sx={{
      fontFamily: BODY_FONT,
      fontWeight: 600,
      fontSize: '0.7rem',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#1a3a8c',
      mb: 1.5,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      '&::before': {
        content: '""',
        display: 'inline-block',
        width: 28,
        height: 2,
        bgcolor: '#1a3a8c',
        flexShrink: 0,
      },
    }}
  >
    {children}
  </Typography>
);

// ── Main component ─────────────────────────────────────────────────────────
const HomePage = () => {
  usePageFonts();
  const navigate = useNavigate();
  const schoolsSectionRef = useRef(null);

  const scrollToSchools = () => {
    schoolsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ bgcolor: '#f4f6fb', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════════════
          HERO — DHS-style: full-width slideshow photo + bottom banner
      ══════════════════════════════════════════════════════════════ */}
      <Box sx={{ position: 'relative', width: '100%', height: { xs: '89vh', md: '100vh' }, overflow: 'hidden' }}>

        {/* Background slideshow fills the hero box */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <BackgroundSlideshow fullscreen />
        </Box>

        {/* Subtle dark gradient at bottom for banner legibility */}
        <Box
          sx={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 50%, rgba(10,20,60,0.72) 100%)',
          }}
        />

        {/* ── DHS-style bottom banner ── */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            zIndex: 2,
            bgcolor: 'rgba(18, 38, 105, 0.93)',
            backdropFilter: 'blur(8px)',
            borderTop: '3px solid #2e5fe8',
            py: { xs: 3, md: 4 },
            px: { xs: 3, md: 6 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 2.5, md: 0 },
          }}
        >
          {/* Left: Title block */}
          <Box sx={{ flex: 1 }}>
            <Typography
              component="h1"
              sx={{
                position: 'relative',
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: { xs: '1.7rem', sm: '2.2rem', md: '2.8rem' },
                color: '#ffffff',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                mb: 0,
              }}
            >
              ADMISSIONS
            </Typography>
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontWeight: 400,
                fontSize: { xs: '0.9rem', md: '1rem' },
                color: 'rgba(255,255,255,0.72)',
                letterSpacing: '0.04em',
              }}
            >
              KwaZulu-Natal · 2025 / 2026 Academic Year
            </Typography>
          </Box>

          {/* Divider — desktop only */}
          

          {/* Right: CTA button — mirrors DHS "Click here to submit" */}
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => navigate('/apply')}
            sx={{
              fontFamily: BODY_FONT,
              fontWeight: 700,
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              letterSpacing: '0.04em',
              textTransform: 'none',
              bgcolor: '#2e5fe8',
              color: '#ffffff',
              px: { xs: 3, md: 5 },
              py: 1.6,
              borderRadius: '2px',
              boxShadow: '0 4px 20px rgba(46,95,232,0.45)',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: '#1a3a8c',
                boxShadow: '0 6px 28px rgba(26,58,140,0.55)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Click here to start the Application
          </Button>
        </Box>

        
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          STATS BAR — white strip, blue accents
      ══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: '#ffffff',
          borderBottom: '1px solid rgba(26,58,140,0.12)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          py: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} justifyContent="center" alignItems="center">
            {STATS.map((s, i) => (
              <Grid size={{ xs: 6, md: 3 }} key={s.label}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 2,
                    px: 2,
                    borderRight: i < STATS.length - 1 ? '1px solid rgba(26,58,140,0.1)' : 'none',
                    ...(i % 2 === 1 && { borderRight: 'none' }),
                    '@media (min-width: 900px)': {
                      borderRight: i < STATS.length - 1 ? '1px solid rgba(26,58,140,0.1)' : 'none',
                    },
                  }}
                >
                  <Box sx={{ color: '#2e5fe8', mb: 1 }}>{s.icon}</Box>
                  <Typography
                    sx={{
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 700,
                      fontSize: { xs: '2rem', md: '2.6rem' },
                      color: '#1a2340',
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    <AnimatedNumber target={s.value} suffix={s.suffix} />
                  </Typography>
                  <Typography
                    sx={{
                      
                      fontFamily: BODY_FONT,
                      fontWeight: 400,
                      fontSize: '0.72rem',
                      color: '#5a6a90',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
                             SCHOOLS SECTION 
      ══════════════════════════════════════════════════════════════ */}
      <Box
        ref={schoolsSectionRef}
        sx={{ bgcolor: '#f4f6fb', py: { xs: 7, md: 10 } }}
      >
        <Container maxWidth="lg" justifyContent="center" alignItems="center">
          {/* Section header */}
          <Box sx={{ mb: { xs: 5, md: 7 }, maxWidth: 560 }}>
            <SectionLabel>Partner Institutions</SectionLabel>
            <Typography
              variant="h2"
              sx={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.8rem' },
                color: '#1a2340',
                lineHeight: 1.15,
                mb: 2,
              }}
            >
              Explore Our Schools
            </Typography>
            <Typography
              sx={{
                fontFamily: BODY_FONT,
                fontWeight: 400,
                fontSize: '1rem',
                color: '#4a5a80',
                lineHeight: 1.8,
              }}
            >
              Each school offers unique programmes, facilities, and learning environments.
              Find the one that matches your ambitions.
            </Typography>
          </Box>

          <SchoolList bodyFont={BODY_FONT} displayFont={DISPLAY_FONT} />

            <Box sx={{ textAlign: 'center', mt: 6 }}>
              <Button
                variant="outlined"
                size="large"
                endIcon={<EastIcon />}
                onClick={() => navigate('/apply')}
                sx={{
                  fontFamily: BODY_FONT,
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  px: 5,
                  py: 1.5,
                  borderRadius: '2px',
                  borderColor: '#2e5fe8',
                  borderWidth: 2,
                  color: '#2e5fe8',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#1a3a8c',
                    bgcolor: 'rgba(46,95,232,0.06)',
                    color: '#1a3a8c',
                  },
                }}
              >
                Start Your Application
              </Button>
            </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS — Pretoria Boys card strip, blue accent
      ══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: '#ffffff',
          borderTop: '1px solid rgba(26,58,140,0.1)',
          borderBottom: '1px solid rgba(26,58,140,0.1)',
          py: { xs: 7, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 } }}>
            <SectionLabel sx={{ justifyContent: 'center' }}>Simple Process</SectionLabel>
            <Typography
              variant="h2"
              sx={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.8rem' },
                color: '#1a2340',
                lineHeight: 1.15,
              }}
            >
              How It Works
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 3, md: 4 }}>
            {STEPS.map((step, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={step.num}>
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    p: { xs: 3, md: 4 },
                    bgcolor: '#f4f6fb',
                    border: '1px solid rgba(26,58,140,0.12)',
                    borderTop: '3px solid #2e5fe8',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: '#ffffff',
                      borderTopColor: '#1a3a8c',
                      boxShadow: '0 8px 32px rgba(26,58,140,0.12)',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  {/* Watermark number */}
                  <Typography
                    sx={{
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 700,
                      fontSize: '5rem',
                      color: 'rgba(26,58,140,0.05)',
                      position: 'absolute',
                      top: 12, right: 20,
                      lineHeight: 1,
                      userSelect: 'none',
                    }}
                  >
                    {step.num}
                  </Typography>

                  <Box
                    sx={{
                      width: 52, height: 52,
                      borderRadius: '2px',
                      bgcolor: 'rgba(46,95,232,0.1)',
                      border: '1px solid rgba(46,95,232,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#2e5fe8',
                      mb: 3,
                    }}
                  >
                    {step.icon}
                  </Box>

                  <Typography
                    sx={{
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 700,
                      fontSize: '1.35rem',
                      color: '#1a2340',
                      mb: 1.5,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: BODY_FONT,
                      fontWeight: 400,
                      fontSize: '0.92rem',
                      color: '#4a5a80',
                      lineHeight: 1.8,
                    }}
                  >
                    {step.desc}
                  </Typography>

                  {i < STEPS.length - 1 && (
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        position: 'absolute',
                        right: -20, top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        color: 'rgba(46,95,232,0.3)',
                      }}
                    >
                      <EastIcon sx={{ fontSize: 20 }} />
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM CTA STRIP — deep navy, matches DHS admissions feel
      ══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: '#0f1e5a',
          borderTop: '3px solid #2e5fe8',
          py: { xs: 5, md: 7 },
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: { xs: '1.7rem', md: '2.3rem' },
            color: '#ffffff',
            mb: 1,
          }}
        >
          Ready to secure your place?
        </Typography>
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontWeight: 400,
            fontSize: '0.98rem',
            color: 'rgba(255,255,255,0.6)',
            mb: 4,
          }}
        >
          Applications are open for the 2025 / 2026 academic year.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            endIcon={<EastIcon />}
            onClick={() => navigate('/apply')}
            sx={{
              fontFamily: BODY_FONT,
              fontWeight: 700,
              px: 5, py: 1.7,
              fontSize: '1rem',
              borderRadius: '2px',
              bgcolor: '#2e5fe8',
              color: '#ffffff',
              textTransform: 'none',
              boxShadow: '0 4px 20px rgba(46,95,232,0.4)',
              '&:hover': { bgcolor: '#1a3a8c' },
            }}
          >
            Apply Now
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login-applicant')}
            sx={{
              fontFamily: BODY_FONT,
              fontWeight: 600,
              px: 5, py: 1.7,
              fontSize: '1rem',
              borderRadius: '2px',
              borderColor: 'rgba(255,255,255,0.4)',
              borderWidth: 2,
              color: 'white',
              textTransform: 'none',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.07)' },
            }}
          >
            Check My Status
          </Button>
        </Stack>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: '#080f2e',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          py: 3,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.05em',
          }}
        >
          © {new Date().getFullYear()} School Application System · KwaZulu-Natal · All rights reserved
        </Typography>
      </Box>

    </Box>
  );
};

export default HomePage;



