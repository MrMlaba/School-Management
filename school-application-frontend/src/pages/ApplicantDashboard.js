import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Container,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Avatar,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';

/* ─── Design Tokens ─────────────────────────────────────────────────── */
const C = {
  navy:      '#0f1f3d',
  navyMid:   '#1a3260',
  slate:     '#4a5568',
  slateLight:'#718096',
  border:    '#e2e8f0',
  bg:        '#f7f8fc',
  white:     '#ffffff',
  accent:    '#2563eb',
  accentSoft:'#eff4ff',
  success:   '#059669',
  successBg: '#ecfdf5',
  danger:    '#dc2626',
  dangerBg:  '#fef2f2',
  warn:      '#d97706',
  warnBg:    '#fffbeb',
  info:      '#0284c7',
  infoBg:    '#f0f9ff',
};

/* ─── Status helpers ─────────────────────────────────────────────────── */
const STATUS = {
  pending:  { label: 'Pending Review', color: C.warn,    bg: C.warnBg    },
  approved: { label: 'Approved',       color: C.success, bg: C.successBg },
  rejected: { label: 'Rejected',       color: C.danger,  bg: C.dangerBg  },
  accepted: { label: 'Offer Accepted', color: C.info,    bg: C.infoBg    },
};

const getStatus = (s) => STATUS[s] || { label: s, color: C.slate, bg: C.bg };

const DOC_NAMES = {
  id:          'SA ID Copy',
  removal:     'School Removal Letter',
  gradeResult: 'Previous Grade Result',
  gradeReport: 'Grade Report',
  additional:  'Additional Document',
};

/* ─── Shared styles ─────────────────────────────────────────────────── */
const cardSx = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '12px',
  boxShadow: '0 1px 4px rgba(15,31,61,0.06), 0 4px 16px rgba(15,31,61,0.04)',
  transition: 'box-shadow 0.2s, transform 0.2s',
  '&:hover': {
    boxShadow: '0 4px 24px rgba(15,31,61,0.1)',
    transform: 'translateY(-2px)',
  },
};

/* ─── StatusBadge ────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = getStatus(status);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        px: 1.5,
        py: '3px',
        borderRadius: '20px',
        background: s.bg,
        border: `1px solid ${s.color}22`,
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: s.color, letterSpacing: '0.02em' }}>
        {s.label}
      </Typography>
    </Box>
  );
};

/* ─── InfoRow ────────────────────────────────────────────────────────── */
const InfoRow = ({ label, value }) =>
  value ? (
    <Box sx={{ display: 'flex', gap: 2, py: 0.75, borderBottom: `1px solid ${C.border}`, '&:last-child': { borderBottom: 0 } }}>
      <Typography sx={{ minWidth: 180, fontSize: 13, color: C.slateLight, fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: C.navy, flex: 1 }}>{value}</Typography>
    </Box>
  ) : null;

/* ─── SectionHeading ─────────────────────────────────────────────────── */
const SectionHeading = ({ icon: Icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, mt: 3 }}>
    <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon sx={{ fontSize: 16, color: C.accent }} />
    </Box>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.navy, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
      {title}
    </Typography>
  </Box>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
const ApplicantDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const nationalId    = searchParams.get('nationalId');
  const applicationId = searchParams.get('applicationId');

  useEffect(() => { fetchApplications(); }, [nationalId, applicationId]);

  const fetchApplications = async () => {
    try {
      const params = new URLSearchParams();
      if (nationalId)    params.append('nationalId', nationalId);
      if (applicationId) params.append('applicationId', applicationId);

      const response = await fetch(`http://localhost:5005/api/applicant-applications?${params}`);
      const data = await response.json();

      if (response.ok) {
        setApplications(data);
        if (nationalId) localStorage.setItem('nationalId', nationalId);
      } else {
        setError(data.message || 'Failed to fetch applications');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (appId) => {
    setUpdating(prev => ({ ...prev, [appId]: true }));
    const storedNationalId = nationalId || localStorage.getItem('nationalId');

    try {
      const response = await fetch(`http://localhost:5005/api/applications/${appId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId: storedNationalId }),
      });
      const data = await response.json();
      if (response.ok) {
        setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: 'accepted' } : app));
      } else {
        setError(data.message || 'Failed to accept offer.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(prev => ({ ...prev, [appId]: false }));
    }
  };

  const handleEditApplication = (application) => {
    const params = new URLSearchParams({ edit: 'true', applicationId: application.id, nationalId: application.nationalId });
    navigate(`/apply?${params.toString()}`);
  };

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setDetailsDialogOpen(true);
  };

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ color: C.accent }} />
          <Typography sx={{ mt: 2, color: C.slate, fontSize: 14 }}>Loading your applications…</Typography>
        </Box>
      </Box>
    );
  }

  /* ── Page ────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ minHeight: '100vh', background: C.bg, fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' }}>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <Box sx={{ background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <Container maxWidth="lg" sx={{ py: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolIcon sx={{ color: C.white, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
                Application Portal
              </Typography>
              <Typography sx={{ fontSize: 12, color: C.slateLight }}>
                Track and manage your school applications
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>

        {/* ── Page title ─────────────────────────────────────────── */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em' }}>
            My Applications
          </Typography>
          <Typography sx={{ fontSize: 14, color: C.slateLight, mt: 0.5 }}>
            {applications.length} application{applications.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: '10px', border: `1px solid ${C.dangerBg}`, fontSize: 13 }}
          >
            {error}
          </Alert>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {applications.length === 0 ? (
          <Card sx={{ ...cardSx, textAlign: 'center', py: 8 }}>
            <AssignmentIcon sx={{ fontSize: 48, color: C.border, mb: 2 }} />
            <Typography sx={{ fontSize: 17, fontWeight: 600, color: C.navy }}>No applications found</Typography>
            <Typography sx={{ fontSize: 14, color: C.slateLight, mt: 1 }}>
              Please verify your National ID or Application ID and try again.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={2.5}>
            {applications.map((app) => (
              <Grid item xs={12} md={6} lg={4} key={app.id}>
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 3 }}>

                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{ width: 40, height: 40, background: C.accentSoft, color: C.accent, fontSize: 16, fontWeight: 700, borderRadius: '10px' }}
                        >
                          {app.school?.charAt(0) || 'S'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.3 }}>
                            {app.school}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: C.slateLight }}> {app.grade}</Typography>
                        </Box>
                      </Box>
                      <StatusBadge status={app.status} />
                    </Box>

                    {/* Details */}
                    <Box sx={{ background: C.bg, borderRadius: '8px', p: 1.5, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography sx={{ fontSize: 12, color: C.slateLight }}>Applicant</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.navy }}>
                          {app.firstName} {app.lastName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 12, color: C.slateLight }}>Application ID</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.navy, fontFamily: 'monospace' }}>
                          {app.id}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Feedback */}
                    {app.comment && (
                      <Box sx={{ background: C.warnBg, border: `1px solid ${C.warn}22`, borderRadius: '8px', p: 1.5, mb: 2 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.warn, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Feedback
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: C.navy }}>
                          {app.comment}
                        </Typography>
                      </Box>
                    )}

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 1, borderTop: `1px solid ${C.border}` }}>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={() => handleViewDetails(app)}
                        sx={{
                          fontSize: 12, fontWeight: 600, color: C.slate,
                          textTransform: 'none', px: 1.5, py: 0.75,
                          borderRadius: '6px',
                          '&:hover': { background: C.bg, color: C.navy },
                        }}
                      >
                        View Details
                      </Button>

                      {['pending', 'rejected'].includes(app.status) && (
                        <Button
                          size="small"
                          startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                          onClick={() => handleEditApplication(app)}
                          sx={{
                            fontSize: 12, fontWeight: 600, color: C.accent,
                            textTransform: 'none', px: 1.5, py: 0.75,
                            borderRadius: '6px',
                            '&:hover': { background: C.accentSoft },
                          }}
                        >
                          Edit
                        </Button>
                      )}

                      {app.status === 'approved' && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          onClick={() => handleAcceptOffer(app.id)}
                          disabled={updating[app.id]}
                          sx={{
                            fontSize: 12, fontWeight: 600, textTransform: 'none',
                            px: 1.5, py: 0.75, borderRadius: '6px',
                            background: C.success, boxShadow: 'none',
                            '&:hover': { background: '#047857', boxShadow: 'none' },
                          }}
                        >
                          {updating[app.id] ? 'Accepting…' : 'Accept Offer'}
                        </Button>
                      )}

                      {app.status === 'accepted' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CheckCircleIcon sx={{ fontSize: 14, color: C.success }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.success }}>Offer Accepted</Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* ══ Details Dialog ══════════════════════════════════════════════ */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => { setDetailsDialogOpen(false); setSelectedApplication(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(15,31,61,0.15)',
            border: `1px solid ${C.border}`,
          }
        }}
      >
        {/* Dialog header */}
        <Box sx={{ px: 3.5, pt: 3, pb: 2, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: C.navy }}>
              Application Details
            </Typography>
            <Typography sx={{ fontSize: 13, color: C.slateLight, mt: 0.25 }}>
              {selectedApplication?.school} · Grade {selectedApplication?.grade}
            </Typography>
          </Box>
          {selectedApplication && <StatusBadge status={selectedApplication.status} />}
        </Box>

        <DialogContent sx={{ px: 3.5, py: 2.5 }}>
          {selectedApplication && (
            <Box>
              <SectionHeading icon={PersonIcon} title="Personal Information" />
              <Box sx={{ background: C.bg, borderRadius: '10px', p: 2 }}>
                <InfoRow label="Full Name"     value={`${selectedApplication.firstName} ${selectedApplication.lastName}`} />
                <InfoRow label="Date of Birth" value={selectedApplication.dateOfBirth} />
                <InfoRow label="Email"         value={selectedApplication.email} />
                <InfoRow label="Phone"         value={selectedApplication.phone} />
                <InfoRow label="Address"       value={selectedApplication.address} />
                <InfoRow label="City"          value={selectedApplication.city} />
              </Box>

              <SectionHeading icon={PersonIcon} title="Parent / Guardian" />
              <Box sx={{ background: C.bg, borderRadius: '10px', p: 2 }}>
                <InfoRow label="Name"         value={selectedApplication.parentName} />
                <InfoRow label="Phone"        value={selectedApplication.parentPhone} />
                <InfoRow label="Email"        value={selectedApplication.parentEmail} />
                <InfoRow label="Occupation"   value={selectedApplication.parentOccupation} />
                <InfoRow label="Relationship" value={selectedApplication.relationship} />
              </Box>

              <SectionHeading icon={SchoolIcon} title="Academic Information" />
              <Box sx={{ background: C.bg, borderRadius: '10px', p: 2 }}>
                <InfoRow label="School"          value={selectedApplication.school} />
                <InfoRow label="Grade"           value={selectedApplication.grade} />
                <InfoRow label="Previous School" value={selectedApplication.previousSchool} />
                <InfoRow label="Achievements"    value={selectedApplication.achievements} />
                <InfoRow label="Why Attend"      value={selectedApplication.whyAttend} />
              </Box>

              <SectionHeading icon={PersonIcon} title="Emergency Contact" />
              <Box sx={{ background: C.bg, borderRadius: '10px', p: 2 }}>
                <InfoRow label="Name"  value={selectedApplication.emergencyContact} />
                <InfoRow label="Phone" value={selectedApplication.emergencyPhone} />
              </Box>

              <SectionHeading icon={AssignmentIcon} title="Documents" />
              <Box sx={{ background: C.bg, borderRadius: '10px', p: 2 }}>
                {selectedApplication.documents?.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedApplication.documents.map((doc, idx) => (
                      <Chip
                        key={idx}
                        label={DOC_NAMES[doc.type] || doc.type}
                        size="small"
                        sx={{
                          background: C.accentSoft,
                          color: C.accent,
                          fontWeight: 600,
                          fontSize: 12,
                          border: `1px solid ${C.accent}22`,
                          borderRadius: '6px',
                        }}
                      />
                    ))}
                    <Typography sx={{ width: '100%', fontSize: 12, color: C.slateLight, mt: 1 }}>
                      {selectedApplication.documentCount || selectedApplication.documents.length} document(s) uploaded
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 13, color: C.slateLight }}>No documents uploaded.</Typography>
                )}
              </Box>

              {/* Timestamps */}
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: C.slateLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                    {new Date(selectedApplication.submittedAt).toLocaleString()}
                  </Typography>
                </Box>
                {selectedApplication.updatedAt && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: C.slateLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Updated</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                      {new Date(selectedApplication.updatedAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                {selectedApplication.comment && (
                  <Box sx={{ width: '100%', background: C.warnBg, border: `1px solid ${C.warn}33`, borderRadius: '8px', p: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: C.warn, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>Feedback</Typography>
                    <Typography sx={{ fontSize: 13, color: C.navy }}>{selectedApplication.comment}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3.5, py: 2, borderTop: `1px solid ${C.border}` }}>
          <Button
            onClick={() => { setDetailsDialogOpen(false); setSelectedApplication(null); }}
            variant="contained"
            sx={{
              background: C.navy, color: C.white, fontWeight: 600,
              textTransform: 'none', borderRadius: '8px', px: 3,
              boxShadow: 'none',
              '&:hover': { background: C.navyMid, boxShadow: 'none' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicantDashboard;