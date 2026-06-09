import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, Button, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Container, Chip, Divider, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Snackbar, Tooltip,
} from '@mui/material';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import ExpandLessIcon    from '@mui/icons-material/ExpandLess';
import FileDownloadIcon  from '@mui/icons-material/FileDownload';
import PeopleAltIcon     from '@mui/icons-material/PeopleAlt';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import SchoolIcon        from '@mui/icons-material/School';
import SearchIcon        from '@mui/icons-material/Search';
import HourglassTopIcon  from '@mui/icons-material/HourglassTop';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import PersonAddIcon     from '@mui/icons-material/PersonAdd';
import InfoOutlinedIcon  from '@mui/icons-material/InfoOutlined';
import * as XLSX from 'xlsx';

/* ─── Design tokens (unchanged from original) ───────────────────────── */
const C = {
  brand:      '#1A3557',
  accent:     '#2E7D32',
  border:     '#D0D7DE',
  headerBg:   '#F0F4F8',
  rowHover:   '#F7FAFC',
  rowAlt:     '#FAFBFC',
  text:       '#1A2332',
  muted:      '#6B7C93',
  white:      '#FFFFFF',
  chipRecent: '#E8F5E9',
  chipText:   '#2E7D32',
  pending:    '#FFF3E0',
  pendingText:'#E65100',
  enrolled:   '#E8F5E9',
  enrolledText:'#2E7D32',
  warn:       '#FFF3F3',
  warnBorder: '#FFCDD2',
  warnText:   '#C62828',
  streamColors: {
    Science:    { bg: '#EEF2FF', color: '#3730A3' },
    Commerce:   { bg: '#FFF7ED', color: '#C2410C' },
    Humanities: { bg: '#FDF4FF', color: '#7E22CE' },
    General:    { bg: '#F0F9FF', color: '#0369A1' },
  },
};

/* ─── Table cell styles ─────────────────────────────────────────────── */
const headCell = {
  backgroundColor: C.headerBg,
  color: C.brand,
  fontWeight: 700,
  fontSize: '0.78rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderBottom: `2px solid ${C.brand}`,
  borderRight: `1px solid ${C.border}`,
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const bodyCell = {
  fontSize: '0.875rem',
  color: C.text,
  borderBottom: `1px solid ${C.border}`,
  borderRight: `1px solid ${C.border}`,
  padding: '9px 14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
};

/* ─── Stat card ─────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color, subtitle }) => (
  <Box sx={{
    flex: 1, minWidth: 160,
    background: C.white,
    border: `1px solid ${C.border}`,
    borderTop: `3px solid ${color || C.brand}`,
    borderRadius: '6px',
    padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 2,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }}>
    <Box sx={{ color: color || C.brand, display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: C.text, lineHeight: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif", mt: 0.3 }}>
        {label}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.7rem', color: C.pendingText, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  </Box>
);

/* ─── Tab button ────────────────────────────────────────────────────── */
const TabButton = ({ active, onClick, icon, label, count, color }) => (
  <Button
    onClick={onClick}
    sx={{
      display: 'flex', alignItems: 'center', gap: 1,
      px: 2.5, py: 1.25, borderRadius: '6px',
      textTransform: 'none', fontWeight: 700,
      fontSize: '0.88rem', fontFamily: "'IBM Plex Sans', sans-serif",
      background: active ? C.brand : 'transparent',
      color: active ? C.white : C.muted,
      border: active ? `1.5px solid ${C.brand}` : `1.5px solid ${C.border}`,
      boxShadow: active ? '0 2px 8px rgba(26,53,87,0.15)' : 'none',
      '&:hover': { background: active ? C.brand : C.headerBg },
      transition: 'all 0.15s',
    }}
  >
    {icon}
    {label}
    {count !== undefined && (
      <Chip
        label={count}
        size="small"
        sx={{
          ml: 0.5, height: 20, fontSize: '0.72rem', fontWeight: 700,
          background: active ? 'rgba(255,255,255,0.2)' : (color || C.headerBg),
          color: active ? C.white : (C.text),
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      />
    )}
  </Button>
);

/* ─── Enroll confirmation dialog ────────────────────────────────────── */
const EnrollDialog = ({ open, applicant, onConfirm, onClose, enrolling }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
    PaperProps={{ sx: { borderRadius: '8px', fontFamily: "'IBM Plex Sans', sans-serif" } }}
  >
    <DialogTitle sx={{ fontWeight: 800, color: C.brand, fontSize: '1.1rem', fontFamily: "'IBM Plex Sans', sans-serif", pb: 1 }}>
      Confirm Enrollment
    </DialogTitle>
    <Divider />
    <DialogContent sx={{ pt: 2.5 }}>
      {applicant && (
        <Box>
          {/* Info banner */}
          <Box sx={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', p: 1.5, mb: 2.5, display: 'flex', gap: 1.5 }}>
            <InfoOutlinedIcon sx={{ color: '#1D4ED8', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#1D4ED8', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5 }}>
              Only enroll this learner after they have <strong>physically reported to the school</strong>.
              This action confirms their place and generates a student number.
            </Typography>
          </Box>

          {/* Applicant summary */}
          {[
            ['Full Name',    `${applicant.firstName} ${applicant.lastName}`],
            ['National ID',  applicant.nationalId || '—'],
            ['Grade',        applicant.grade],
            ['Stream',       applicant.subject || 'N/A (Grade 8–9)'],
            ['Parent',       applicant.parentName || '—'],
            ['Parent Phone', applicant.parentPhone || '—'],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', gap: 2, py: 0.75, borderBottom: `1px solid ${C.border}` }}>
              <Typography sx={{ minWidth: 130, fontSize: '0.82rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </DialogContent>
    <Divider />
    <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
      <Button
        onClick={onClose}
        disabled={enrolling}
        sx={{ textTransform: 'none', fontWeight: 600, color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={enrolling}
        startIcon={enrolling ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}
        sx={{
          background: C.accent, textTransform: 'none', fontWeight: 700,
          borderRadius: '6px', px: 2.5, boxShadow: 'none',
          fontFamily: "'IBM Plex Sans', sans-serif",
          '&:hover': { background: '#1B5E20', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
        }}
      >
        {enrolling ? 'Enrolling…' : 'Confirm Enrollment'}
      </Button>
    </DialogActions>
  </Dialog>
);

/* ─── Pending Enrollment table ──────────────────────────────────────── */
const PendingTable = ({ students, onEnroll, formatDate }) => {
  if (students.length === 0) {
    return (
      <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px', p: 5, textAlign: 'center', background: C.white }}>
        <CheckCircleIcon sx={{ color: C.accent, fontSize: 40, mb: 1 }} />
        <Typography sx={{ color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.95rem' }}>
          No pending enrollments — all accepted offers have been processed.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <TableContainer>
        <Table size="small" sx={{ borderCollapse: 'collapse' }}>
          <TableHead>
            <TableRow>
              {['#', 'Full Name', 'National ID', 'Grade', 'Subject Stream', 'Parent', 'Parent Phone', 'Offer Accepted', 'Action'].map(h => (
                <TableCell key={h} sx={{ ...headCell, ...(h === 'Action' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s, idx) => (
              <TableRow key={s.id} sx={{ backgroundColor: idx % 2 === 0 ? C.white : C.rowAlt, '&:hover': { backgroundColor: C.rowHover } }}>
                <TableCell sx={{ ...bodyCell, color: C.muted, width: 40, textAlign: 'center' }}>{idx + 1}</TableCell>
                <TableCell sx={{ ...bodyCell, fontWeight: 600 }}>{s.firstName} {s.lastName}</TableCell>
                <TableCell sx={bodyCell}>{s.nationalId || '—'}</TableCell>
                <TableCell sx={bodyCell}>{s.grade}</TableCell>
                <TableCell sx={bodyCell}>
                  {s.subject ? (
                    <Chip
                      label={s.subject} size="small"
                      sx={{ background: '#EEF2FF', color: '#3730A3', fontWeight: 600, fontSize: '0.72rem', height: 22, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    />
                  ) : <Typography sx={{ fontSize: '0.82rem', color: C.muted }}>—</Typography>}
                </TableCell>
                <TableCell sx={bodyCell}>{s.parentName || '—'}</TableCell>
                <TableCell sx={bodyCell}>{s.parentPhone || '—'}</TableCell>
                <TableCell sx={bodyCell}>{s.updatedAt ? formatDate(s.updatedAt) : '—'}</TableCell>
                <TableCell sx={{ ...bodyCell, borderRight: 'none' }}>
                  <Tooltip title="Enroll after learner physically reports to school">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PersonAddIcon sx={{ fontSize: '13px !important' }} />}
                      onClick={() => onEnroll(s)}
                      sx={{
                        background: C.brand, textTransform: 'none', fontWeight: 700,
                        fontSize: '0.75rem', borderRadius: '5px', px: 1.5, py: 0.5,
                        boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif",
                        '&:hover': { background: '#0F2544', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Enroll
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

/* ─── Enrolled Students — grade accordion (mirrors original design) ─── */
const EnrolledGradeSection = ({ grade, gradeStudents, formatDate, isSelected, onSelect }) => {
  const [open, setOpen] = useState(true);

  return (
    <Box sx={{ mb: 2, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <Box
        onClick={() => onSelect ? onSelect(grade) : setOpen(o => !o)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 18px',
          background: C.headerBg,
          borderBottom: open ? `1px solid ${C.border}` : 'none',
          cursor: 'pointer', userSelect: 'none',
          '&:hover': { background: '#E8EEF5' }, transition: 'background 0.15s',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SchoolIcon sx={{ color: C.brand, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, color: C.brand, fontSize: '0.95rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {grade}
          </Typography>
          <Chip
            label={`${gradeStudents.length} student${gradeStudents.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ background: C.chipRecent, color: C.chipText, fontWeight: 700, fontSize: '0.72rem', height: 22, fontFamily: "'IBM Plex Sans', sans-serif" }}
          />
        </Box>
        {open ? <ExpandLessIcon sx={{ color: C.muted, fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: C.muted, fontSize: 20 }} />}
      </Box>

      {open && (
        <TableContainer>
          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableHead>
              <TableRow>
                {['#', 'Student No.', 'Full Name', 'National ID', 'Email', 'Phone', 'Stream', 'Enrolled Date'].map(h => (
                  <TableCell key={h} sx={{ ...headCell, ...(h === 'Enrolled Date' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {gradeStudents.map((s, idx) => {
                const streamStyle = C.streamColors[s.stream] || C.streamColors.General;
                return (
                  <TableRow key={s.id} sx={{ backgroundColor: idx % 2 === 0 ? C.white : C.rowAlt, '&:hover': { backgroundColor: C.rowHover } }}>
                    <TableCell sx={{ ...bodyCell, color: C.muted, width: 40, textAlign: 'center' }}>{idx + 1}</TableCell>
                    <TableCell sx={{ ...bodyCell, fontFamily: 'monospace', fontSize: '0.82rem', color: C.brand, fontWeight: 700 }}>
                      {s.studentNumber}
                    </TableCell>
                    <TableCell sx={{ ...bodyCell, fontWeight: 600 }}>{s.firstName} {s.lastName}</TableCell>
                    <TableCell sx={bodyCell}>{s.nationalId || '—'}</TableCell>
                    <TableCell sx={{ ...bodyCell, color: '#1565C0' }}>{s.email || '—'}</TableCell>
                    <TableCell sx={bodyCell}>{s.phone || '—'}</TableCell>
                    <TableCell sx={bodyCell}>
                      {s.stream ? (
                        <Chip label={s.stream} size="small" sx={{ background: streamStyle.bg, color: streamStyle.color, fontWeight: 600, fontSize: '0.72rem', height: 22, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell sx={{ ...bodyCell, borderRight: 'none' }}>
                      {s.enrollmentDate ? formatDate(s.enrollmentDate) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
const StudentsPage = () => {
  const [activeTab, setActiveTab]               = useState('pending');    // 'pending' | 'enrolled'
  const [pendingStudents, setPendingStudents]   = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');

  // Enroll dialog state
  const [enrollTarget, setEnrollTarget]         = useState(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrolling, setEnrolling]               = useState(false);
  const [snackbar, setSnackbar]                 = useState({ open: false, message: '', severity: 'success' });

  // Grade selector (enrolled tab)
  const [gradeSearch, setGradeSearch]           = useState('');
  const [selectedGrade, setSelectedGrade]       = useState(null);

  const adminToken = sessionStorage.getItem('adminToken');

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  /* ── Fetch both lists ──────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, enrolledRes] = await Promise.all([
        fetch('https://school-management-production-6167.up.railway.app/api/management/pending-enrollment', { headers: authHeaders }),
        fetch('https://school-management-production-6167.up.railway.app/api/management/enrolled-students',  { headers: authHeaders }),
      ]);

      if (pendingRes.ok && enrolledRes.ok) {
        const [pendingData, enrolledData] = await Promise.all([
          pendingRes.json(),
          enrolledRes.json(),
        ]);
        setPendingStudents(Array.isArray(pendingData) ? pendingData : []);
        setEnrolledStudents(Array.isArray(enrolledData) ? enrolledData : []);
      } else {
        setError('Failed to fetch student data. Please refresh.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Grade grouping (enrolled tab) ──────────────────────────────────── */
  const groupByGrade = (list) => {
    const grouped = {};
    list.forEach(s => {
      const key = s.grade;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  };

  const groupedEnrolled = groupByGrade(enrolledStudents);
  const filteredGrades  = Object.keys(groupedEnrolled)
    .sort()
    .filter(g => g.toLowerCase().includes(gradeSearch.toLowerCase()));

  useEffect(() => {
    if (filteredGrades.length && (!selectedGrade || !filteredGrades.includes(selectedGrade))) {
      setSelectedGrade(filteredGrades[0]);
    }
    if (!filteredGrades.length) setSelectedGrade(null);
  }, [filteredGrades.join(',')]);

  /* ── Enroll action ──────────────────────────────────────────────────── */
  const handleOpenEnroll = (applicant) => {
    setEnrollTarget(applicant);
    setEnrollDialogOpen(true);
  };

  const handleConfirmEnroll = async () => {
    if (!enrollTarget) return;
    setEnrolling(true);
    try {
      const res = await fetch('https://school-management-production-6167.up.railway.app/api/management/enroll', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: enrollTarget.id }),
      });
      const data = await res.json();

      if (res.ok) {
        setSnackbar({ open: true, message: `${enrollTarget.firstName} enrolled — Student No. ${data.studentNumber}`, severity: 'success' });
        setEnrollDialogOpen(false);
        setEnrollTarget(null);
        fetchData(); // refresh both lists
      } else {
        setSnackbar({ open: true, message: data.message || 'Enrollment failed', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Network error. Please try again.', severity: 'error' });
    } finally {
      setEnrolling(false);
    }
  };

  /* ── Export enrolled ────────────────────────────────────────────────── */
  const handleExportEnrolled = () => {
    const wb = XLSX.utils.book_new();
    Object.entries(groupedEnrolled).forEach(([grade, rows]) => {
      const data = rows.map(s => ({
        'Student No.':  s.studentNumber || '',
        'First Name':   s.firstName || '',
        'Last Name':    s.lastName  || '',
        'National ID':  s.nationalId || '',
        'Email':        s.email || '',
        'Phone':        s.phone || '',
        'Grade':        s.grade || '',
        'Stream':       s.stream || '',
        'Enrolled':     s.enrollmentDate ? formatDate(s.enrollmentDate) : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 12) }));
      XLSX.utils.book_append_sheet(wb, ws, `Grade ${grade}`.slice(0, 31));
    });
    XLSX.writeFile(wb, `enrolled_students_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  /* ── Loading ── */
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F0F4F8', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: C.brand }} />
      </Box>
    );
  }

  /* ── Render ── */
  return (
    <Box sx={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Top nav */}
      <Box sx={{
        background: C.brand, padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <Typography sx={{ color: C.white, fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          🎓 STUDENT REGISTRY
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Admin Portal
        </Typography>
      </Box>

      <Container maxWidth="100%" sx={{ py: 4 }}>

        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.2 }}>
              Students
            </Typography>
            <Typography sx={{ color: C.muted, fontSize: '0.875rem', mt: 0.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Manage learner enrollment and track enrolled students
            </Typography>
          </Box>
          {activeTab === 'enrolled' && enrolledStudents.length > 0 && (
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportEnrolled}
              sx={{
                background: C.accent, color: C.white, fontWeight: 700, fontSize: '0.82rem',
                textTransform: 'none', borderRadius: '6px', padding: '9px 20px', boxShadow: 'none',
                fontFamily: "'IBM Plex Sans', sans-serif",
                '&:hover': { background: '#1B5E20', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
              }}
            >
              Export to Excel
            </Button>
          )}
        </Box>

        {/* Stat cards */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
          <StatCard
            icon={<HourglassTopIcon />}
            label="Pending Enrollment"
            value={pendingStudents.length}
            color={C.pendingText}
            subtitle={pendingStudents.length > 0 ? 'Awaiting physical arrival' : undefined}
          />
          <StatCard
            icon={<PeopleAltIcon />}
            label="Enrolled Students"
            value={enrolledStudents.length}
            color={C.accent}
          />
          <StatCard
            icon={<SchoolIcon />}
            label="Grade Groups"
            value={Object.keys(groupedEnrolled).length}
            color={C.brand}
          />
        </Box>

        {error && (
          <Box sx={{ background: C.warn, border: `1px solid ${C.warnBorder}`, borderRadius: '6px', p: '12px 16px', mb: 3 }}>
            <Typography sx={{ color: C.warnText, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>{error}</Typography>
          </Box>
        )}

        {/* ── Tab switcher ─────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            icon={<HourglassTopIcon sx={{ fontSize: 18 }} />}
            label="Pending Enrollment"
            count={pendingStudents.length}
            color={C.pending}
          />
          <TabButton
            active={activeTab === 'enrolled'}
            onClick={() => setActiveTab('enrolled')}
            icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
            label="Enrolled Students"
            count={enrolledStudents.length}
            color={C.enrolled}
          />
        </Box>

        {/* ── PENDING TAB ───────────────────────────────────────────────── */}
        {activeTab === 'pending' && (
          <Box>
            {/* Context note */}
            <Box sx={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', p: 1.5, mb: 2.5, display: 'flex', gap: 1.5 }}>
              <InfoOutlinedIcon sx={{ color: '#D97706', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.82rem', color: '#92400E', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5 }}>
                These learners have <strong>accepted their offer</strong> but are not yet enrolled. 
                Click <strong>Enroll</strong> only after the learner has physically reported to the school and confirmed attendance.
                A learner may have accepted offers at multiple schools — do not enroll until you are sure they have chosen this school.
              </Typography>
            </Box>

            <PendingTable
              students={pendingStudents}
              onEnroll={handleOpenEnroll}
              formatDate={formatDate}
            />
          </Box>
        )}

        {/* ── ENROLLED TAB ──────────────────────────────────────────────── */}
        {activeTab === 'enrolled' && (
          <Box>
            {enrolledStudents.length === 0 ? (
              <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px', p: 5, textAlign: 'center', background: C.white }}>
                <SchoolIcon sx={{ color: C.muted, fontSize: 40, mb: 1 }} />
                <Typography sx={{ color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.95rem' }}>
                  No students enrolled yet. Enroll learners from the Pending Enrollment tab.
                </Typography>
              </Paper>
            ) : (
              <>
                {/* Grade search + label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                  <SchoolIcon sx={{ color: C.brand, fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    All Enrolled Students by Grade
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', background: C.border }} />
                  <TextField
                    size="small"
                    placeholder="Search grade…"
                    value={gradeSearch}
                    onChange={e => setGradeSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: C.muted }} /></InputAdornment>,
                    }}
                    sx={{
                      width: 220, background: C.white, borderRadius: '6px',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px', color: C.text,
                        '& input': { color: C.text },
                        '& fieldset': { borderColor: C.border },
                        '&:hover fieldset': { borderColor: C.brand },
                        '&.Mui-focused fieldset': { borderColor: C.brand, borderWidth: '1.5px' },
                      },
                    }}
                  />
                </Box>

                {/* Two-column layout — grade list + table (mirrors original) */}
                {selectedGrade ? (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {/* Grade sidebar */}
                    <Box sx={{ width: 260, minWidth: 200 }}>
                      <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px', p: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: C.brand, fontSize: '0.9rem', p: '4px 8px', mb: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Grades
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {filteredGrades.map(g => (
                            <Button
                              key={g}
                              onClick={() => setSelectedGrade(g)}
                              sx={{
                                justifyContent: 'space-between', textTransform: 'none',
                                borderRadius: '6px', p: '8px 10px',
                                background: g === selectedGrade ? C.brand : undefined,
                                color: g === selectedGrade ? C.white : C.text,
                                fontFamily: "'IBM Plex Sans', sans-serif",
                                '&:hover': { background: g === selectedGrade ? C.brand : C.rowHover },
                              }}
                            >
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}> {g}</Typography>
                              <Chip label={`${groupedEnrolled[g].length}`} size="small" sx={{ background: C.chipRecent, color: C.chipText }} />
                            </Button>
                          ))}
                        </Box>
                      </Paper>
                    </Box>

                    {/* Grade table */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <EnrolledGradeSection
                        grade={selectedGrade}
                        gradeStudents={groupedEnrolled[selectedGrade]}
                        formatDate={formatDate}
                      />
                    </Box>
                  </Box>
                ) : (
                  filteredGrades.map(grade => (
                    <EnrolledGradeSection
                      key={grade}
                      grade={grade}
                      gradeStudents={groupedEnrolled[grade]}
                      formatDate={formatDate}
                      onSelect={setSelectedGrade}
                    />
                  ))
                )}
              </>
            )}
          </Box>
        )}
      </Container>

      {/* ── Enroll confirmation dialog ──────────────────────────────────── */}
      <EnrollDialog
        open={enrollDialogOpen}
        applicant={enrollTarget}
        onConfirm={handleConfirmEnroll}
        onClose={() => { setEnrollDialogOpen(false); setEnrollTarget(null); }}
        enrolling={enrolling}
      />

      {/* ── Success / error snackbar ────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentsPage;




