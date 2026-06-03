import React, { useEffect, useRef, useState } from 'react';
import SchoolList from '../components/SchoolList';
import BackgroundSlideshow from '../components/BackgroundSlideshow';
import { Typography, Container, Box, Button, Grid, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// ── Fonts ──────────────────────────────────────────────────────────────────
const usePageFonts = () => {
  useEffect(() => {
    if (document.getElementById('home-page-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'home-page-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes countUp { from { opacity: 0; } to { opacity: 1; } }
      .hero-anim { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) both; }
      .hero-anim-1 { animation-delay: 0.1s; }
      .hero-anim-2 { animation-delay: 0.25s; }
      .hero-anim-3 { animation-delay: 0.4s; }
      .step-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .step-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(5,150,105,0.12); }
      .stat-item { transition: transform 0.2s ease; }
      .stat-item:hover { transform: scale(1.04); }
    `;
    document.head.appendChild(style);
  }, []);
};

const G = {
  green:    '#059669',
  greenDk:  '#047857',
  greenLt:  '#D1FAE5',
  greenMd:  '#6EE7B7',
  ink:      '#0F1F1A',
  ink2:     '#1F3329',
  muted:    '#4B6860',
  muted2:   '#7A9E95',
  border:   '#D1E8E0',
  paper:    '#FFFFFF',
  paper2:   '#F4FAF7',
  paper3:   '#EAF5EF',
  accent:   '#F59E0B',
};

const DF = "'DM Serif Display', Georgia, serif";
const BF = "'DM Sans', sans-serif";

// ── Animated counter ───────────────────────────────────────────────────────
const AnimatedNumber = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref     = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let n = 0;
        const step = Math.ceil(target / 60);
        const t = setInterval(() => {
          n += step;
          if (n >= target) { setCount(target); clearInterval(t); }
          else setCount(n);
        }, 20);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const STATS = [
  { icon: <SchoolOutlinedIcon />,        label: 'Partner Schools',    value: 15,   suffix: '+' },
  { icon: <GroupsOutlinedIcon />,        label: 'Applications Filed', value: 2400, suffix: '+' },
  { icon: <VerifiedOutlinedIcon />,      label: 'Acceptance Rate',    value: 87,   suffix: '%' },
  { icon: <CalendarMonthOutlinedIcon />, label: 'Years Running',      value: 8,    suffix: ''  },
];

const STEPS = [
  {
    num: '01', icon: <SchoolOutlinedIcon sx={{ fontSize: 26 }} />,
    title: 'Browse Schools',
    desc: 'Explore partner schools across KwaZulu-Natal — their locations, available grades, and subject streams.',
  },
  {
    num: '02', icon: <DescriptionOutlinedIcon sx={{ fontSize: 26 }} />,
    title: 'Submit Application',
    desc: 'Complete your application online in minutes. Upload required documents and apply to multiple schools at once.',
  },
  {
    num: '03', icon: <TaskAltIcon sx={{ fontSize: 26 }} />,
    title: 'Receive Your Offer',
    desc: 'Track your status in real-time. Accept your offer and prepare for enrolment once approved.',
  },
];

const FEATURES = [
  'Online document upload', 'Real-time application tracking',
  'Multi-school applications', 'Instant status notifications',
  'Secure student portal', 'Digital report cards',
];

export default function HomePage() {
  usePageFonts();
  const navigate = useNavigate();
  const schoolsRef = useRef(null);

  return (
    <Box sx={{ bgcolor: G.paper, minHeight: '100vh', fontFamily: BF }}>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <Box sx={{ position: 'relative', width: '100%', height: { xs: '100svh', md: '100vh' }, overflow: 'hidden', minHeight: 580 }}>

        {/* Background slideshow */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <BackgroundSlideshow fullscreen />
        </Box>

        {/* Gradient overlay — lighter on top so navbar is visible, dark bottom for text */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(160deg, rgba(5,150,105,0.15) 0%, rgba(15,31,26,0.55) 45%, rgba(15,31,26,0.82) 100%)',
        }} />

        {/* Green left accent bar */}
        <Box sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 5, zIndex: 3,
          background: `linear-gradient(to bottom, transparent, ${G.green}, transparent)`,
        }} />

        {/* Hero content */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
          px: { xs: 3, sm: 5, md: 8, lg: 12 },
          pb: { xs: 5, md: 8 },
        }}>
          {/* Tag */}
          <Box className="hero-anim hero-anim-1" sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            bgcolor: G.green, px: 1.75, py: 0.6, borderRadius: '4px',
            width: 'fit-content', mb: 2.5,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />
            <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.72rem', color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              KwaZulu-Natal · 2025 / 2026 Admissions
            </Typography>
          </Box>

          {/* Headline */}
          <Typography className="hero-anim hero-anim-2" component="h1" sx={{
            fontFamily: DF,
            fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.6rem', lg: '5.2rem' },
            color: '#fff',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            mb: 2.5,
            maxWidth: 780,
          }}>
            Your Future<br />
            <Box component="span" sx={{ color: G.greenMd, fontStyle: 'italic' }}>Starts Here.</Box>
          </Typography>

          {/* Sub */}
          <Typography className="hero-anim hero-anim-3" sx={{
            fontFamily: BF, fontWeight: 400,
            fontSize: { xs: '1rem', md: '1.15rem' },
            color: 'rgba(255,255,255,0.75)',
            maxWidth: 520, mb: 4, lineHeight: 1.7,
          }}>
            Apply to leading KwaZulu-Natal high schools online.
            Track your application and secure your place in minutes.
          </Typography>

          {/* CTAs */}
          <Stack className="hero-anim hero-anim-3" direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => navigate('/apply')}
              sx={{
                fontFamily: BF, fontWeight: 700, fontSize: '1rem',
                textTransform: 'none',
                bgcolor: G.green, color: '#fff',
                px: 4, py: 1.6,
                borderRadius: '6px',
                boxShadow: `0 8px 24px rgba(5,150,105,0.4)`,
                '&:hover': { bgcolor: G.greenDk, transform: 'translateY(-2px)', boxShadow: `0 12px 32px rgba(5,150,105,0.5)` },
                transition: 'all 0.2s ease',
              }}
            >
              Apply Now
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login-applicant')}
              sx={{
                fontFamily: BF, fontWeight: 600, fontSize: '1rem',
                textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1.5,
                color: '#fff', px: 4, py: 1.6, borderRadius: '6px',
                backdropFilter: 'blur(8px)',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              Check My Status
            </Button>
          </Stack>
        </Box>

        {/* Scroll hint */}
        <Box sx={{
          position: 'absolute', bottom: 28, right: { xs: 24, md: 48 }, zIndex: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
        }}>
          <Box sx={{
            width: 1.5, height: 40,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5))',
          }} />
          <Typography sx={{ fontFamily: BF, fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', writingMode: 'vertical-rl' }}>
            Scroll
          </Typography>
        </Box>
      </Box>

      {/* ════════════════════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════════════════════ */}
      <Box sx={{ bgcolor: G.ink2, py: { xs: 4, md: 5 } }}>
        <Container maxWidth="lg">
          <Grid container>
            {STATS.map((s, i) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Box className="stat-item" sx={{
                  textAlign: 'center', py: 2.5, px: 2,
                  borderRight: { md: i < 3 ? `1px solid rgba(255,255,255,0.1)` : 'none' },
                  borderBottom: { xs: i < 2 ? `1px solid rgba(255,255,255,0.08)` : 'none', md: 'none' },
                }}>
                  <Box sx={{ color: G.greenMd, mb: 1, '& svg': { fontSize: 22 } }}>{s.icon}</Box>
                  <Typography sx={{
                    fontFamily: DF, fontWeight: 400,
                    fontSize: { xs: '2.2rem', md: '2.8rem' },
                    color: '#fff', lineHeight: 1, mb: 0.5,
                  }}>
                    <AnimatedNumber target={s.value} suffix={s.suffix} />
                  </Typography>
                  <Typography sx={{
                    fontFamily: BF, fontWeight: 500, fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════
          SCHOOLS SECTION
      ════════════════════════════════════════════════════════ */}
      <Box ref={schoolsRef} sx={{ bgcolor: G.paper2, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">

          {/* Section header */}
          <Box sx={{ mb: { xs: 6, md: 8 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 32, height: 2, bgcolor: G.green }} />
                <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.72rem', color: G.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Partner Institutions
                </Typography>
              </Box>
              <Typography variant="h2" sx={{
                fontFamily: DF, fontWeight: 400,
                fontSize: { xs: '2.2rem', md: '3rem' },
                color: G.ink, lineHeight: 1.1, mb: 1.5,
              }}>
                Explore Our Schools
              </Typography>
              <Typography sx={{
                fontFamily: BF, fontWeight: 400, fontSize: '1rem',
                color: G.muted, lineHeight: 1.75, maxWidth: 440,
              }}>
                Each school offers unique programmes and learning environments.
                Find the one that matches your ambitions.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/apply')}
              sx={{
                fontFamily: BF, fontWeight: 600, fontSize: '0.9rem',
                textTransform: 'none', flexShrink: 0,
                borderColor: G.green, color: G.green,
                px: 3.5, py: 1.4, borderRadius: '6px', borderWidth: 1.5,
                '&:hover': { bgcolor: G.greenLt, borderColor: G.greenDk },
              }}
            >
              Start Application
            </Button>
          </Box>

          <SchoolList bodyFont={BF} displayFont={DF} />
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <Box sx={{ bgcolor: G.paper, py: { xs: 8, md: 12 }, borderTop: `1px solid ${G.border}` }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 9 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 32, height: 2, bgcolor: G.green }} />
              <Typography sx={{ fontFamily: BF, fontWeight: 600, fontSize: '0.72rem', color: G.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Simple Process
              </Typography>
              <Box sx={{ width: 32, height: 2, bgcolor: G.green }} />
            </Box>
            <Typography variant="h2" sx={{
              fontFamily: DF, fontWeight: 400,
              fontSize: { xs: '2.2rem', md: '3rem' },
              color: G.ink, lineHeight: 1.1,
            }}>
              How It Works
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 3, md: 4 }}>
            {STEPS.map((step, i) => (
              <Grid item xs={12} md={4} key={step.num}>
                <Box className="step-card" sx={{
                  height: '100%', p: { xs: 3.5, md: 4 },
                  bgcolor: G.paper2,
                  border: `1px solid ${G.border}`,
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Green top accent */}
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: G.green }} />

                  {/* Step number watermark */}
                  <Typography sx={{
                    position: 'absolute', top: 12, right: 20,
                    fontFamily: DF, fontSize: '5.5rem',
                    color: 'rgba(5,150,105,0.07)',
                    lineHeight: 1, userSelect: 'none',
                  }}>
                    {step.num}
                  </Typography>

                  {/* Icon */}
                  <Box sx={{
                    width: 52, height: 52, borderRadius: '10px',
                    bgcolor: G.greenLt, color: G.green,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 3, border: `1px solid ${G.greenMd}44`,
                  }}>
                    {step.icon}
                  </Box>

                  <Typography sx={{ fontFamily: DF, fontSize: '1.4rem', color: G.ink, mb: 1.5, lineHeight: 1.2 }}>
                    {step.title}
                  </Typography>
                  <Typography sx={{ fontFamily: BF, fontSize: '0.9rem', color: G.muted, lineHeight: 1.8 }}>
                    {step.desc}
                  </Typography>

                  {/* Connector arrow — desktop only */}
                  {i < 2 && (
                    <Box sx={{
                      display: { xs: 'none', md: 'flex' },
                      position: 'absolute', right: -20, top: '50%',
                      transform: 'translateY(-50%)', zIndex: 2,
                      width: 40, height: 40,
                      bgcolor: G.paper2, borderRadius: '50%',
                      border: `1px solid ${G.border}`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ArrowForwardIcon sx={{ fontSize: 16, color: G.green }} />
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════
          FEATURES STRIP
      ════════════════════════════════════════════════════════ */}
      <Box sx={{ bgcolor: G.paper3, py: { xs: 6, md: 8 }, borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}` }}>
        <Container maxWidth="lg">
          <Typography sx={{
            fontFamily: BF, fontWeight: 600, fontSize: '0.72rem', color: G.green,
            letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', mb: 4,
          }}>
            Everything You Need
          </Typography>
          <Box sx={{
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'center', gap: { xs: 2, md: 3 },
          }}>
            {FEATURES.map(f => (
              <Box key={f} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2, py: 1, borderRadius: '100px',
                bgcolor: G.paper, border: `1px solid ${G.border}`,
              }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: G.green }} />
                <Typography sx={{ fontFamily: BF, fontWeight: 500, fontSize: '0.88rem', color: G.ink2 }}>
                  {f}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════
          CTA STRIP
      ════════════════════════════════════════════════════════ */}
      <Box sx={{
        bgcolor: G.green,
        py: { xs: 7, md: 10 },
        textAlign: 'center', px: 3,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { size: 320, top: -120, right: -80, opacity: 0.08 },
          { size: 200, bottom: -80, left: -60, opacity: 0.06 },
        ].map((c, i) => (
          <Box key={i} sx={{
            position: 'absolute',
            width: c.size, height: c.size,
            borderRadius: '50%',
            border: '1px solid #fff',
            opacity: c.opacity,
            top: c.top, right: c.right,
            bottom: c.bottom, left: c.left,
          }} />
        ))}

        <Typography sx={{
          fontFamily: DF, fontWeight: 400,
          fontSize: { xs: '2rem', md: '3rem' },
          color: '#fff', mb: 1.5, lineHeight: 1.1,
          position: 'relative',
        }}>
          Ready to secure your place?
        </Typography>
        <Typography sx={{
          fontFamily: BF, fontSize: { xs: '0.95rem', md: '1.05rem' },
          color: 'rgba(255,255,255,0.8)', mb: 4.5, lineHeight: 1.7,
          maxWidth: 480, mx: 'auto', position: 'relative',
        }}>
          Applications are open for the 2025/2026 academic year.
          Don't miss your chance to join a top school in KwaZulu-Natal.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ position: 'relative' }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/apply')}
            sx={{
              fontFamily: BF, fontWeight: 700, fontSize: '1rem',
              textTransform: 'none',
              bgcolor: '#fff', color: G.green,
              px: 5, py: 1.7, borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              '&:hover': { bgcolor: G.greenLt },
            }}
          >
            Apply Now
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login-applicant')}
            sx={{
              fontFamily: BF, fontWeight: 600, fontSize: '1rem',
              textTransform: 'none',
              borderColor: 'rgba(255,255,255,0.6)', borderWidth: 1.5,
              color: '#fff', px: 5, py: 1.7, borderRadius: '6px',
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            Check My Status
          </Button>
        </Stack>
      </Box>

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <Box sx={{
        bgcolor: G.ink, py: 4, px: 3,
        display: 'flex', flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center', justifyContent: 'space-between', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: G.green }} />
          <Typography sx={{ fontFamily: BF, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
            School Application System
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: BF, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} · KwaZulu-Natal · All rights reserved
        </Typography>
        <Stack direction="row" spacing={3}>
          {['Privacy Policy', 'Contact Us', 'Help'].map(link => (
            <Typography key={link} sx={{
              fontFamily: BF, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer', '&:hover': { color: G.greenMd },
              transition: 'color 0.15s',
            }}>
              {link}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}