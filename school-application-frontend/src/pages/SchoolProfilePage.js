import API_BASE from '../config';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Container, Chip, Stack, Button,
  CircularProgress, Grid, Dialog, IconButton, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EastIcon from '@mui/icons-material/East';
import CloseIcon from '@mui/icons-material/Close';

const DISPLAY_FONT = "'Cormorant Garamond', Georgia, serif";
const BODY_FONT    = "'Outfit', sans-serif";
const GOLD         = '#e8a020';
const GOLD_LIGHT   = '#e8c06a';
const BLUE         = '#2073e8';

const usePageFonts = () => {
  useEffect(() => {
    if (document.getElementById('school-profile-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'school-profile-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const SectionLabel = ({ children }) => (
  <Typography sx={{
    fontFamily: BODY_FONT, fontWeight: 600, fontSize: '0.72rem', color: GOLD,
    letterSpacing: '0.15em', textTransform: 'uppercase', mb: 1.5,
  }}>
    {children}
  </Typography>
);

const InfoRow = ({ icon, label, value }) => value ? (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
    <Box sx={{ color: BLUE, mt: 0.2, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.68rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)' }}>
        {value}
      </Typography>
    </Box>
  </Box>
) : null;

const TagList = ({ items, color = GOLD_LIGHT, bg = 'rgba(232,160,32,0.1)', border = 'rgba(232,160,32,0.3)' }) => (
  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
    {items.map((item) => (
      <Chip
        key={item}
        label={item}
        size="small"
        sx={{
          fontFamily: BODY_FONT, fontSize: '0.78rem', fontWeight: 500,
          bgcolor: bg, border: `1px solid ${border}`, color, borderRadius: '3px',
          height: 30, px: 0.5,
        }}
      />
    ))}
  </Stack>
);

export default function SchoolProfilePage() {
  usePageFonts();
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/schools/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'School not found' : 'Failed to load school');
        return res.json();
      })
      .then(setSchool)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#080f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    );
  }

  if (error || !school) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#080f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, px: 3 }}>
        <Typography sx={{ fontFamily: DISPLAY_FONT, fontSize: '1.8rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
          {error || 'School not found'}
        </Typography>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />}
          sx={{ fontFamily: BODY_FONT, color: GOLD_LIGHT, textTransform: 'none' }}>
          Back to all schools
        </Button>
      </Box>
    );
  }

  const grades   = Array.isArray(school.grades) ? school.grades : [];
  const streams  = Array.isArray(school.streams) ? school.streams : [];
  const programs = Array.isArray(school.programs) ? school.programs : [];
  const sports   = Array.isArray(school.sports) ? school.sports : [];
  const gallery  = Array.isArray(school.gallery) ? school.gallery : [];
  const isClosed = school.applications_open === false;
  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const windowText = school.application_open_from && school.application_open_until
    ? `${fmtDate(school.application_open_from)} – ${fmtDate(school.application_open_until)}`
    : school.application_open_until
    ? `Closes ${fmtDate(school.application_open_until)}`
    : school.application_open_from
    ? `Opens ${fmtDate(school.application_open_from)}`
    : null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#080f1a' }}>
      {/* ── Hero ── */}
      <Box sx={{ position: 'relative', height: { xs: '52vh', md: '68vh' }, minHeight: 420, overflow: 'hidden' }}>
        <Box
          component="img"
          src={school.image || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80'}
          alt={school.name}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(8,15,26,1) 5%, rgba(8,15,26,0.55) 55%, rgba(8,15,26,0.25) 100%)',
        }} />
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: GOLD }} />

        {/* Back link */}
        <Button
          component={RouterLink} to="/" startIcon={<ArrowBackIcon />}
          sx={{
            position: 'absolute', top: { xs: 76, md: 96 }, left: { xs: 16, md: 40 },
            fontFamily: BODY_FONT, fontWeight: 500, fontSize: '0.85rem', textTransform: 'none',
            color: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
            px: 1.75, py: 0.6, borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.55)', color: '#fff' },
          }}
        >
          All Schools
        </Button>

        {/* Logo badge */}
        {school.logo && (
          <Box sx={{
            position: 'absolute', top: { xs: 76, md: 96 }, right: { xs: 16, md: 40 },
            width: 64, height: 64, borderRadius: '10px', overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.95)', border: '2px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box component="img" src={school.logo} alt={`${school.name} logo`} sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }} />
          </Box>
        )}

        {/* Name + quick facts */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: { xs: 3, md: 6 }, pb: { xs: 4, md: 6 } }}>
          <Container maxWidth="lg" disableGutters>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.72rem', color: GOLD_LIGHT, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Partner Institution
              </Typography>
              <Chip
                label={isClosed ? 'Applications Closed' : 'Applications Open'}
                size="small"
                sx={{
                  fontFamily: BODY_FONT, fontWeight: 700, fontSize: '0.66rem', letterSpacing: '0.04em',
                  height: 22, borderRadius: '3px',
                  bgcolor: isClosed ? 'rgba(220,38,38,0.18)' : 'rgba(34,197,94,0.18)',
                  border: `1px solid ${isClosed ? 'rgba(248,113,113,0.4)' : 'rgba(74,222,128,0.4)'}`,
                  color: isClosed ? '#fca5a5' : '#86efac',
                }}
              />
            </Stack>
            <Typography sx={{
              fontFamily: DISPLAY_FONT, fontWeight: 700,
              fontSize: { xs: '2.4rem', md: '3.6rem' },
              color: '#fff', lineHeight: 1.05, mb: 1.5,
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              maxWidth: 720,
            }}>
              {school.name}
            </Typography>
            <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <LocationOnOutlinedIcon sx={{ fontSize: 18, color: GOLD_LIGHT }} />
                <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)' }}>{school.location}</Typography>
              </Box>
            </Stack>
          </Container>
        </Box>
      </Box>

      {/* ── Body ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Grid container spacing={{ xs: 5, md: 7 }}>
          {/* Main column */}
          <Grid item xs={12} md={8}>
            {school.about && (
              <Box sx={{ mb: 5 }}>
                <SectionLabel>About This School</SectionLabel>
                <Typography sx={{ fontFamily: BODY_FONT, fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.85, fontWeight: 300, whiteSpace: 'pre-wrap' }}>
                  {school.about}
                </Typography>
              </Box>
            )}

            {programs.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <SectionLabel>Programmes &amp; Activities</SectionLabel>
                <TagList items={programs} />
              </Box>
            )}

            {sports.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <SectionLabel>Sport</SectionLabel>
                <TagList items={sports} color="#8fc4ff" bg="rgba(32,115,232,0.1)" border="rgba(32,115,232,0.3)" />
              </Box>
            )}

            {gallery.length > 0 && (
              <Box>
                <SectionLabel>Gallery</SectionLabel>
                <Grid container spacing={1.25}>
                  {gallery.map((photo) => (
                    <Grid item xs={6} sm={4} key={photo.id}>
                      <Box
                        onClick={() => setLightbox(photo)}
                        sx={{
                          borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                          aspectRatio: '4 / 3', border: '1px solid rgba(255,255,255,0.1)',
                          position: 'relative',
                          '&:hover img': { transform: 'scale(1.08)' },
                        }}
                      >
                        <Box
                          component="img"
                          src={photo.url}
                          alt={photo.caption || school.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {!school.about && programs.length === 0 && sports.length === 0 && gallery.length === 0 && (
              <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                This school hasn't added a full profile yet — check back soon, or apply below to learn more directly.
              </Typography>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Box sx={{
              position: { md: 'sticky' }, top: { md: 100 },
              bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', p: 3,
            }}>
              <Stack spacing={2.5}>
                <InfoRow icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} label="Principal" value={school.principal} />
                <InfoRow icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />} label="Phone" value={school.phone} />
                <InfoRow icon={<EmailOutlinedIcon sx={{ fontSize: 18 }} />} label="Email" value={school.email} />
              </Stack>

              {(grades.length > 0 || streams.length > 0) && <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2.5 }} />}

              {grades.length > 0 && (
                <Box sx={{ mb: streams.length ? 2.5 : 0 }}>
                  <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.68rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1 }}>
                    Grades Offered
                  </Typography>
                  <TagList items={grades} color="rgba(255,255,255,0.8)" bg="rgba(255,255,255,0.06)" border="rgba(255,255,255,0.15)" />
                </Box>
              )}

              {streams.length > 0 && (
                <Box>
                  <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.68rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1 }}>
                    Subject Streams (Gr 10–12)
                  </Typography>
                  <TagList items={streams} color="#8fc4ff" bg="rgba(32,115,232,0.1)" border="rgba(32,115,232,0.3)" />
                </Box>
              )}

              {isClosed ? (
                <Box sx={{ mt: 3, p: 1.75, borderRadius: '6px', bgcolor: 'rgba(220,38,38,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
                  <Typography sx={{ fontFamily: BODY_FONT, fontWeight: 600, fontSize: '0.85rem', color: '#fca5a5' }}>
                    Not accepting applications right now
                  </Typography>
                  {windowText && (
                    <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      {windowText}
                    </Typography>
                  )}
                </Box>
              ) : (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={<EastIcon />}
                    onClick={() => navigate('/apply?school=' + encodeURIComponent(school.name))}
                    sx={{
                      fontFamily: BODY_FONT, fontWeight: 700, fontSize: '0.92rem', textTransform: 'none',
                      bgcolor: GOLD, color: '#0a0e1a', mt: 3, py: 1.3, borderRadius: '6px',
                      boxShadow: 'none', '&:hover': { bgcolor: '#f0b030', boxShadow: 'none' },
                    }}
                  >
                    Apply to this School
                  </Button>
                  {windowText && (
                    <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', mt: 1, textAlign: 'center' }}>
                      Accepting applications: {windowText}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── Lightbox ── */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg"
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } }}>
        <IconButton onClick={() => setLightbox(null)} sx={{ position: 'absolute', top: -44, right: -8, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
          <CloseIcon />
        </IconButton>
        {lightbox && (
          <Box component="img" src={lightbox.url} alt={lightbox.caption || school.name}
            sx={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block', borderRadius: '4px' }} />
        )}
      </Dialog>
    </Box>
  );
}
