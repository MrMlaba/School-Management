import API_BASE from '../config';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Container, Chip, Divider,
  TextField, MenuItem, CircularProgress, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import DeleteIcon        from '@mui/icons-material/Delete';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon        from '@mui/icons-material/School';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import MenuBookIcon      from '@mui/icons-material/MenuBook';
import ClassIcon         from '@mui/icons-material/Class';
import SettingsIcon      from '@mui/icons-material/Settings';

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  brand:    '#1A3557',
  accent:   '#2E7D32',
  border:   '#D0D7DE',
  headerBg: '#F0F4F8',
  rowHover: '#F7FAFC',
  rowAlt:   '#FAFBFC',
  text:     '#000000',
  muted:    '#6B7C93',
  white:    '#FFFFFF',
  danger:   '#C62828',
  dangerBg: '#FFEBEE',
};

const BASE = `${API_BASE}`;

const headCell = {
  backgroundColor: C.headerBg, color: C.text, fontWeight: 700,
  fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: `2px solid ${C.brand}`, borderRight: `1px solid ${C.border}`,
  padding: '9px 14px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Sans', sans-serif",
};
const bodyCell = {
  fontSize: '0.855rem', color: C.text, borderBottom: `1px solid ${C.border}`,
  borderRight: `1px solid ${C.border}`, padding: '8px 14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
};

/* ─── Helpers ───────────────────────────────────────────────────────── */
const authH = () => ({ Authorization: `Bearer ${sessionStorage.getItem('adminToken')}` });
const json  = body => ({ 'Content-Type': 'application/json', ...authH() });

const GRADES  = [8, 9, 10, 11, 12];
const STREAMS = ['Physics', 'Commerce', 'Humanities'];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TERMS   = [1, 2, 3, 4];

/* ─── Step indicator ────────────────────────────────────────────────── */
const steps = [
  { key: 'year',     label: 'Academic Year', icon: <CalendarMonthIcon sx={{ fontSize: 18 }} /> },
  { key: 'terms',    label: 'Terms',          icon: <CalendarMonthIcon sx={{ fontSize: 18 }} /> },
  { key: 'periods',  label: 'Periods',        icon: <AccessTimeIcon   sx={{ fontSize: 18 }} /> },
  { key: 'subjects', label: 'Subjects',       icon: <MenuBookIcon     sx={{ fontSize: 18 }} /> },
  { key: 'classes',  label: 'Classes',        icon: <ClassIcon        sx={{ fontSize: 18 }} /> },
];

const StepTab = ({ step, active, done, onClick }) => (
  <Button
    onClick={onClick}
    sx={{
      display: 'flex', alignItems: 'center', gap: 1,
      px: 2, py: 1, borderRadius: '6px', textTransform: 'none',
      fontWeight: 700, fontSize: '0.85rem', fontFamily: "'IBM Plex Sans', sans-serif",
      background: active ? C.brand : 'transparent',
      color: active ? C.white : done ? C.accent : C.muted,
      border: active ? `1.5px solid ${C.brand}` : `1.5px solid ${C.border}`,
      '&:hover': { background: active ? C.brand : C.headerBg },
    }}
  >
    {done && !active
      ? <CheckCircleIcon sx={{ fontSize: 16, color: C.accent }} />
      : step.icon}
    {step.label}
  </Button>
);

/* ─── Section wrapper ───────────────────────────────────────────────── */
const Section = ({ title, subtitle, children, action }) => (
  <Box sx={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', p: 3, mb: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.82rem', color: C.muted, mt: 0.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
    <Divider sx={{ mb: 2.5, borderColor: C.border }} />
    {children}
  </Box>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════ */
const SchoolSetupPage = () => {
  const [activeStep, setActiveStep] = useState('year');
  const [summary,    setSummary]    = useState(null);
  const [snackbar,   setSnackbar]   = useState({ open: false, message: '', severity: 'success' });

  // Data
  const [academicYears,    setAcademicYears]    = useState([]);
  const [terms,            setTerms]            = useState([]);
  const [periods,          setPeriods]          = useState([]);
  const [subjects,         setSubjects]         = useState([]);
  const [classes,          setClasses]          = useState([]);
  const [nationalSubjects, setNationalSubjects] = useState([]);

  // Loading
  const [saving, setSaving] = useState(false);

  const toast = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  /* ── Fetch summary ───────────────────────────────────────────────── */
  const fetchSummary = useCallback(async () => {
    const res = await fetch(`${BASE}/api/setup/summary`, { headers: authH() });
    if (res.ok) setSummary(await res.json());
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  /* ── Fetch academic years ────────────────────────────────────────── */
  const fetchYears = async () => {
    const res = await fetch(`${BASE}/api/setup/academic-years`, { headers: authH() });
    if (res.ok) setAcademicYears(await res.json());
  };

  /* ── Fetch terms ─────────────────────────────────────────────────── */
  const fetchTerms = async () => {
    if (!summary?.currentYearId) return;
    const res = await fetch(`${BASE}/api/setup/terms?academicYearId=${summary.currentYearId}`, { headers: authH() });
    if (res.ok) setTerms(await res.json());
  };

  /* ── Fetch periods ───────────────────────────────────────────────── */
  const fetchPeriods = async () => {
    const res = await fetch(`${BASE}/api/setup/periods`, { headers: authH() });
    if (res.ok) setPeriods(await res.json());
  };

  /* ── Fetch subjects ──────────────────────────────────────────────── */
  const fetchSubjects = async () => {
    if (!summary?.currentYearId) return;
    const res = await fetch(`${BASE}/api/setup/subjects?academicYearId=${summary.currentYearId}`, { headers: authH() });
    if (res.ok) setSubjects(await res.json());
  };

  /* ── Fetch classes ───────────────────────────────────────────────── */
  const fetchClasses = async () => {
    if (!summary?.currentYearId) return;
    const res = await fetch(`${BASE}/api/setup/classes?academicYearId=${summary.currentYearId}`, { headers: authH() });
    if (res.ok) setClasses(await res.json());
  };

  /* ── Fetch national subjects ─────────────────────────────────────── */
  const fetchNational = async (grade, stream) => {
    let url = `${BASE}/api/setup/national-subjects?`;
    if (grade)  url += `grade=${grade}&`;
    if (stream) url += `stream=${stream}`;
    const res = await fetch(url, { headers: authH() });
    if (res.ok) setNationalSubjects(await res.json());
  };

  useEffect(() => {
    fetchYears();
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (summary?.currentYearId) {
      fetchTerms();
      fetchSubjects();
      fetchClasses();
    }
  }, [summary?.currentYearId]);

  const isDone = {
    year:     !!summary?.hasCurrentYear,
    terms:    summary?.terms >= 4,
    periods:  summary?.periods > 0,
    subjects: summary?.subjects > 0,
    classes:  summary?.classes > 0,
  };

  /* ══════════════════════════════════════════════════════════════════
     ACADEMIC YEAR SECTION
  ══════════════════════════════════════════════════════════════════ */
  const AcademicYearSection = () => {
    const [newYear, setNewYear] = useState('2026');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
      setLoading(true);
      const res = await fetch(`${BASE}/api/setup/academic-years`, {
        method: 'POST', headers: json(),
        body: JSON.stringify({ year: parseInt(newYear) }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) { toast(`Academic year ${newYear} created`); fetchYears(); fetchSummary(); }
      else toast(data.message || 'Failed', 'error');
    };

    return (
      <Section title="Academic Year" subtitle="Set the current academic year for your school.">
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Year" value={newYear} onChange={e => setNewYear(e.target.value)}
            size="small" type="number" sx={{ width: 140 }}
            inputProps={{ min: 2024, max: 2030 }}
          />
          <Button
            variant="contained" onClick={handleCreate} disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
            sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {loading ? 'Creating…' : 'Set Academic Year'}
          </Button>
        </Box>

        {academicYears.length > 0 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px' }}>
            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  {['Year', 'Status'].map(h => (
                    <TableCell key={h} sx={headCell}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {academicYears.map((y, idx) => (
                  <TableRow key={y.id} sx={{ backgroundColor: idx % 2 === 0 ? C.white : C.rowAlt }}>
                    <TableCell sx={bodyCell}><strong>{y.year}</strong></TableCell>
                    <TableCell sx={{ ...bodyCell, borderRight: 'none' }}>
                      {y.is_current
                        ? <Chip label="Current" size="small" sx={{ bgcolor: '#E8F5E9', color: C.accent, fontWeight: 700, fontSize: '0.72rem' }} />
                        : <Chip label="Past" size="small" sx={{ bgcolor: C.headerBg, color: C.muted, fontSize: '0.72rem' }} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     TERMS SECTION
  ══════════════════════════════════════════════════════════════════ */
  const TermsSection = () => {
    const [termDates, setTermDates] = useState(
      TERMS.reduce((acc, t) => ({ ...acc, [t]: { startDate: '', endDate: '' } }), {})
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      const map = {};
      terms.forEach(t => {
        map[t.term_number] = {
          startDate: t.start_date?.slice(0, 10) || '',
          endDate:   t.end_date?.slice(0, 10)   || '',
        };
      });
      setTermDates(prev => ({ ...prev, ...map }));
    }, [terms]);

    const handleSaveTerm = async (termNumber) => {
      if (!summary?.currentYearId) return toast('Set academic year first', 'error');
      const d = termDates[termNumber];
      if (!d.startDate || !d.endDate) return toast('Both dates are required', 'error');

      setSaving(true);
      const res = await fetch(`${BASE}/api/setup/terms`, {
        method: 'POST', headers: json(),
        body: JSON.stringify({
          academicYearId: summary.currentYearId,
          termNumber,
          startDate: d.startDate,
          endDate:   d.endDate,
        }),
      });
      setSaving(false);
      if (res.ok) { toast(`Term ${termNumber} saved`); fetchTerms(); fetchSummary(); }
      else { const e = await res.json(); toast(e.message || 'Failed', 'error'); }
    };

    return (
      <Section
        title="Terms"
        subtitle={`Set the start and end dates for each term in ${summary?.currentYear || 'the current year'}.`}
      >
        {!summary?.hasCurrentYear && (
          <Box sx={{ p: 2, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', mb: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#92400E', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Set an academic year first before configuring terms.
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TERMS.map(t => {
            const saved = terms.find(x => x.term_number === t);
            return (
              <Box key={t} sx={{
                display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                p: 1.5, borderRadius: '6px',
                background: saved ? '#F0FDF4' : C.headerBg,
                border: `1px solid ${saved ? '#BBF7D0' : C.border}`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
                  {saved
                    ? <CheckCircleIcon sx={{ color: C.accent, fontSize: 18 }} />
                    : <RadioButtonUncheckedIcon sx={{ color: C.muted, fontSize: 18 }} />}
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Term {t}
                  </Typography>
                </Box>
                <TextField
                  label="Start Date" type="date" size="small"
                  value={termDates[t]?.startDate || ''}
                  onChange={e => setTermDates(p => ({ ...p, [t]: { ...p[t], startDate: e.target.value } }))}
                  InputLabelProps={{ shrink: true }}
                  disabled={!summary?.hasCurrentYear}
                  sx={{ width: 180 }}
                />
                <TextField
                  label="End Date" type="date" size="small"
                  value={termDates[t]?.endDate || ''}
                  onChange={e => setTermDates(p => ({ ...p, [t]: { ...p[t], endDate: e.target.value } }))}
                  InputLabelProps={{ shrink: true }}
                  disabled={!summary?.hasCurrentYear}
                  sx={{ width: 180 }}
                />
                <Button
                  size="small" variant="contained"
                  onClick={() => handleSaveTerm(t)}
                  disabled={saving || !summary?.hasCurrentYear}
                  sx={{
                    background: saved ? C.accent : C.brand, textTransform: 'none',
                    fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {saved ? 'Update' : 'Save'}
                </Button>
              </Box>
            );
          })}
        </Box>
      </Section>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     PERIODS SECTION
  ══════════════════════════════════════════════════════════════════ */
  const PeriodsSection = () => {
    const DEFAULT_PERIODS = [
      { periodNumber: 1,  name: 'Period 1',      timeStart: '07:30', timeEnd: '08:15', isBreak: false },
      { periodNumber: 2,  name: 'Period 2',      timeStart: '08:15', timeEnd: '09:00', isBreak: false },
      { periodNumber: 3,  name: 'Period 3',      timeStart: '09:00', timeEnd: '09:45', isBreak: false },
      { periodNumber: 4,  name: 'Morning Break', timeStart: '09:45', timeEnd: '10:05', isBreak: true  },
      { periodNumber: 5,  name: 'Period 4',      timeStart: '10:05', timeEnd: '10:50', isBreak: false },
      { periodNumber: 6,  name: 'Period 5',      timeStart: '10:50', timeEnd: '11:35', isBreak: false },
      { periodNumber: 7,  name: 'Period 6',      timeStart: '11:35', timeEnd: '12:20', isBreak: false },
      { periodNumber: 8,  name: 'Lunch',         timeStart: '12:20', timeEnd: '13:00', isBreak: true  },
      { periodNumber: 9,  name: 'Period 7',      timeStart: '13:00', timeEnd: '13:45', isBreak: false },
      { periodNumber: 10, name: 'Period 8',      timeStart: '13:45', timeEnd: '14:30', isBreak: false },
    ];

    const [rows, setRows]   = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (periods.length > 0) {
        setRows(periods.map(p => ({
          periodNumber: p.period_number,
          name:         p.name,
          timeStart:    p.time_start?.slice(0, 5) || '',
          timeEnd:      p.time_end?.slice(0, 5)   || '',
          isBreak:      p.is_break,
        })));
      } else {
        setRows(DEFAULT_PERIODS);
      }
    }, [periods]);

    const updateRow = (idx, field, value) =>
      setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));

    const addRow = () => setRows(r => [...r, {
      periodNumber: r.length + 1, name: `Period ${r.length + 1}`,
      timeStart: '', timeEnd: '', isBreak: false,
    }]);

    const removeRow = (idx) => setRows(r => r.filter((_, i) => i !== idx)
      .map((row, i) => ({ ...row, periodNumber: i + 1 })));

    const handleSave = async () => {
      setSaving(true);
      const res = await fetch(`${BASE}/api/setup/periods`, {
        method: 'PUT', headers: json(), body: JSON.stringify({ periods: rows }),
      });
      setSaving(false);
      if (res.ok) { toast('Periods saved'); fetchPeriods(); fetchSummary(); }
      else { const e = await res.json(); toast(e.message || 'Failed', 'error'); }
    };

    return (
      <Section
        title="Daily Periods"
        subtitle="Define the time slots for your school day. Include breaks."
        action={
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ background: C.accent, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {saving ? 'Saving…' : 'Save All Periods'}
          </Button>
        }
      >
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px', mb: 2 }}>
          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableHead>
              <TableRow>
                {['#', 'Name', 'Start', 'End', 'Break?', ''].map(h => (
                  <TableCell key={h} sx={{ ...headCell, ...(h === '' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} sx={{ backgroundColor: row.isBreak ? '#FFF8E1' : (idx % 2 === 0 ? C.white : C.rowAlt) }}>
                  <TableCell sx={{ ...bodyCell, color: C.muted, width: 40, textAlign: 'center' }}>{row.periodNumber}</TableCell>
                  <TableCell sx={bodyCell}>
                    <TextField
                      value={row.name} size="small" variant="standard"
                      onChange={e => updateRow(idx, 'name', e.target.value)}
                      sx={{ width: 160, '& input': { fontSize: '0.855rem', fontFamily: "'IBM Plex Sans', sans-serif" } }}
                    />
                  </TableCell>
                  <TableCell sx={bodyCell}>
                    <TextField
                      value={row.timeStart} size="small" type="time" variant="standard"
                      onChange={e => updateRow(idx, 'timeStart', e.target.value)}
                      sx={{ width: 100, '& input': { fontSize: '0.855rem' } }}
                    />
                  </TableCell>
                  <TableCell sx={bodyCell}>
                    <TextField
                      value={row.timeEnd} size="small" type="time" variant="standard"
                      onChange={e => updateRow(idx, 'timeEnd', e.target.value)}
                      sx={{ width: 100, '& input': { fontSize: '0.855rem' } }}
                    />
                  </TableCell>
                  <TableCell sx={bodyCell}>
                    <Switch
                      checked={row.isBreak} size="small"
                      onChange={e => updateRow(idx, 'isBreak', e.target.checked)}
                    />
                  </TableCell>
                  <TableCell sx={{ ...bodyCell, borderRight: 'none' }}>
                    <IconButton size="small" onClick={() => removeRow(idx)} sx={{ color: C.danger }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button
          size="small" startIcon={<AddIcon />} onClick={addRow}
          sx={{ textTransform: 'none', fontWeight: 600, color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Add period
        </Button>
      </Section>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     SUBJECTS SECTION
  ══════════════════════════════════════════════════════════════════ */
  const SubjectsSection = () => {
    const [filterGrade,  setFilterGrade]  = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [addGrade,     setAddGrade]     = useState('');
    const [addStream,    setAddStream]    = useState('');
    const [selected,     setSelected]     = useState([]);
    const [adding,       setAdding]       = useState(false);

    const loadNational = () => {
      if (addGrade) fetchNational(parseInt(addGrade), parseInt(addGrade) >= 10 ? addStream : '');
    };

    useEffect(() => { if (addGrade) loadNational(); }, [addGrade, addStream]);

    const filteredSubjects = subjects.filter(s => {
      if (filterGrade  && s.grade  !== parseInt(filterGrade))  return false;
      if (filterStream && s.stream !== filterStream) return false;
      return true;
    });

    // National subjects not yet added for this grade/stream
    const alreadyAdded = new Set(subjects.filter(s => s.grade === parseInt(addGrade) && (s.stream === addStream || (!s.stream && !addStream))).map(s => s.national_subject_id));
    const available = nationalSubjects.filter(ns => !alreadyAdded.has(ns.id));

    const handleAdd = async () => {
      if (!selected.length) return toast('Select at least one subject', 'error');
      if (!summary?.currentYearId) return toast('Set academic year first', 'error');

      setAdding(true);
      const payload = selected.map(nsId => ({
        academicYearId:    summary.currentYearId,
        nationalSubjectId: nsId,
        grade:             parseInt(addGrade),
        stream:            parseInt(addGrade) >= 10 ? addStream || null : null,
      }));

      const res = await fetch(`${BASE}/api/setup/subjects`, {
        method: 'POST', headers: json(), body: JSON.stringify(payload),
      });
      setAdding(false);
      if (res.ok) { toast(`${selected.length} subject(s) added`); setSelected([]); fetchSubjects(); fetchSummary(); }
      else { const e = await res.json(); toast(e.message || 'Failed', 'error'); }
    };

    const handleRemove = async (id) => {
      const res = await fetch(`${BASE}/api/setup/subjects/${id}`, { method: 'DELETE', headers: authH() });
      if (res.ok) { toast('Subject removed'); fetchSubjects(); fetchSummary(); }
      else toast('Failed to remove', 'error');
    };

    return (
      <Section title="Subjects" subtitle="Add subjects for each grade. Grade 10–12 subjects are stream-specific.">
        {!summary?.hasCurrentYear && (
          <Box sx={{ p: 2, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', mb: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#92400E', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Set an academic year first.
            </Typography>
          </Box>
        )}

        {/* Add subjects */}
        <Box sx={{ background: C.headerBg, border: `1px solid ${C.border}`, borderRadius: '6px', p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: C.text, mb: 1.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Add Subjects
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField
              select label="Grade" value={addGrade} onChange={e => { setAddGrade(e.target.value); setSelected([]); }}
              size="small" sx={{ width: 120 }}
            >
              {GRADES.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
            </TextField>

            {parseInt(addGrade) >= 10 && (
              <TextField
                select label="Stream" value={addStream} onChange={e => { setAddStream(e.target.value); setSelected([]); }}
                size="small" sx={{ width: 160 }}
              >
                <MenuItem value="">All streams</MenuItem>
                {STREAMS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )}
          </Box>

          {addGrade && available.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted, mb: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Select subjects to add:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                {available.map(ns => (
                  <Chip
                    key={ns.id}
                    label={ns.name}
                    size="small"
                    clickable
                    onClick={() => setSelected(p => p.includes(ns.id) ? p.filter(x => x !== ns.id) : [...p, ns.id])}
                    sx={{
                      fontWeight: 600, fontSize: '0.75rem', fontFamily: "'IBM Plex Sans', sans-serif",
                      background: selected.includes(ns.id) ? C.brand : C.white,
                      color:      selected.includes(ns.id) ? C.white : C.text,
                      border:     `1px solid ${selected.includes(ns.id) ? C.brand : C.border}`,
                    }}
                  />
                ))}
              </Box>
              <Button
                variant="contained" size="small" onClick={handleAdd} disabled={!selected.length || adding}
                sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {adding ? 'Adding…' : `Add ${selected.length || ''} Subject${selected.length !== 1 ? 's' : ''}`}
              </Button>
            </Box>
          )}

          {addGrade && available.length === 0 && (
            <Typography sx={{ fontSize: '0.82rem', color: C.accent, mt: 1.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              ✓ All available subjects for this grade/stream have been added.
            </Typography>
          )}
        </Box>

        {/* Filter + list */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            select label="Filter Grade" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            size="small" sx={{ width: 140 }}
          >
            <MenuItem value="">All Grades</MenuItem>
            {GRADES.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
          </TextField>
          {parseInt(filterGrade) >= 10 && (
            <TextField
              select label="Filter Stream" value={filterStream} onChange={e => setFilterStream(e.target.value)}
              size="small" sx={{ width: 160 }}
            >
              <MenuItem value="">All Streams</MenuItem>
              {STREAMS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          )}
        </Box>

        {filteredSubjects.length === 0 ? (
          <Typography sx={{ color: C.muted, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            No subjects added yet.
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px' }}>
            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  {['Subject', 'Code', 'Grade', 'Stream', ''].map(h => (
                    <TableCell key={h} sx={{ ...headCell, ...(h === '' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSubjects.map((s, idx) => (
                  <TableRow key={s.id} sx={{ backgroundColor: idx % 2 === 0 ? C.white : C.rowAlt, '&:hover': { backgroundColor: C.rowHover } }}>
                    <TableCell sx={{ ...bodyCell, fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell sx={bodyCell}><Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.code || '—'}</Typography></TableCell>
                    <TableCell sx={bodyCell}>Grade {s.grade}</TableCell>
                    <TableCell sx={bodyCell}>
                      {s.stream
                        ? <Chip label={s.stream} size="small" sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: '#EEF2FF', color: '#3730A3' }} />
                        : <Typography sx={{ fontSize: '0.8rem', color: C.muted }}>All</Typography>}
                    </TableCell>
                    <TableCell sx={{ ...bodyCell, borderRight: 'none', textAlign: 'right' }}>
                      <Tooltip title="Remove subject">
                        <IconButton size="small" onClick={() => handleRemove(s.id)} sx={{ color: C.danger }}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     CLASSES SECTION
  ══════════════════════════════════════════════════════════════════ */
  const ClassesSection = () => {
    const [grade,    setGrade]    = useState('');
    const [stream,   setStream]   = useState('');
    const [letter,   setLetter]   = useState('');
    const [capacity, setCapacity] = useState(40);
    const [adding,   setAdding]   = useState(false);
    const [filterGrade, setFilterGrade] = useState('');

    const handleAdd = async () => {
      if (!grade || !letter) return toast('Grade and letter are required', 'error');
      if (!summary?.currentYearId) return toast('Set academic year first', 'error');
      if (parseInt(grade) >= 10 && !stream) return toast('Stream required for Grade 10–12', 'error');

      setAdding(true);
      const res = await fetch(`${BASE}/api/setup/classes`, {
        method: 'POST', headers: json(),
        body: JSON.stringify({
          academicYearId: summary.currentYearId,
          grade: parseInt(grade),
          stream: parseInt(grade) >= 10 ? stream : null,
          letter,
          capacity,
        }),
      });
      setAdding(false);
      if (res.ok) { toast(`Class ${grade}${letter} created`); fetchClasses(); fetchSummary(); }
      else { const e = await res.json(); toast(e.message || 'Failed', 'error'); }
    };

    const handleRemove = async (id, name) => {
      const res = await fetch(`${BASE}/api/setup/classes/${id}`, { method: 'DELETE', headers: authH() });
      if (res.ok) { toast(`Class ${name} removed`); fetchClasses(); fetchSummary(); }
      else toast('Failed to remove', 'error');
    };

    const filtered = classes.filter(c => !filterGrade || c.grade === parseInt(filterGrade));

    return (
      <Section title="Classes" subtitle="Create classes per grade. Grade 10–12 classes require a stream.">
        {!summary?.hasCurrentYear && (
          <Box sx={{ p: 2, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', mb: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#92400E', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Set an academic year first.
            </Typography>
          </Box>
        )}

        {/* Add class form */}
        <Box sx={{ background: C.headerBg, border: `1px solid ${C.border}`, borderRadius: '6px', p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: C.text, mb: 1.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Add New Class
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField
              select label="Grade" value={grade} onChange={e => { setGrade(e.target.value); setStream(''); }}
              size="small" sx={{ width: 120 }}
            >
              {GRADES.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
            </TextField>

            {parseInt(grade) >= 10 && (
              <TextField
                select label="Stream" value={stream} onChange={e => setStream(e.target.value)}
                size="small" sx={{ width: 160 }}
              >
                {STREAMS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )}

            <TextField
              select label="Letter" value={letter} onChange={e => setLetter(e.target.value)}
              size="small" sx={{ width: 100 }}
            >
              {LETTERS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>

            <TextField
              label="Capacity" value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 40)}
              size="small" type="number" sx={{ width: 110 }}
              inputProps={{ min: 1, max: 60 }}
            />

            <Button
              variant="contained" onClick={handleAdd} disabled={adding || !summary?.hasCurrentYear}
              startIcon={adding ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
              sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {adding ? 'Adding…' : 'Add Class'}
            </Button>
          </Box>

          {grade && letter && (
            <Typography sx={{ fontSize: '0.8rem', color: C.muted, mt: 1.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Preview: <strong style={{ color: C.text }}>{grade}{letter}{stream ? ` — ${stream}` : ''}</strong> · Capacity: {capacity}
            </Typography>
          )}
        </Box>

        {/* Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            select label="Filter Grade" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            size="small" sx={{ width: 150 }}
          >
            <MenuItem value="">All Grades</MenuItem>
            {GRADES.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
          </TextField>
        </Box>

        {filtered.length === 0 ? (
          <Typography sx={{ color: C.muted, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            No classes created yet.
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px' }}>
            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  {['Class', 'Grade', 'Stream', 'Capacity', ''].map(h => (
                    <TableCell key={h} sx={{ ...headCell, ...(h === '' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((cls, idx) => (
                  <TableRow key={cls.id} sx={{ backgroundColor: idx % 2 === 0 ? C.white : C.rowAlt, '&:hover': { backgroundColor: C.rowHover } }}>
                    <TableCell sx={{ ...bodyCell, fontWeight: 700, color: C.text, fontFamily: 'monospace', fontSize: '0.9rem' }}>{cls.name}</TableCell>
                    <TableCell sx={bodyCell}>Grade {cls.grade}</TableCell>
                    <TableCell sx={bodyCell}>
                      {cls.stream
                        ? <Chip label={cls.stream} size="small" sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: '#EEF2FF', color: '#3730A3' }} />
                        : <Typography sx={{ fontSize: '0.8rem', color: C.muted }}>—</Typography>}
                    </TableCell>
                    <TableCell sx={bodyCell}>{cls.capacity}</TableCell>
                    <TableCell sx={{ ...bodyCell, borderRight: 'none', textAlign: 'right' }}>
                      <Tooltip title="Remove class">
                        <IconButton size="small" onClick={() => handleRemove(cls.id, cls.name)} sx={{ color: C.danger }}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>
    );
  };

  /* ─── Render ────────────────────────────────────────────────────── */
  return (
    <Box sx={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Top nav */}
      <Box sx={{ background: C.brand, px: '32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ color: C.white, fontSize: 20 }} />
          <Typography sx={{ color: C.white, fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            SCHOOL SETUP
          </Typography>
        </Box>
        {summary?.currentYear && (
          <Chip label={`Academic Year ${summary.currentYear}`} size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: C.white, fontWeight: 700, fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.3)' }}
          />
        )}
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* Page heading */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.2 }}>
            School Setup
          </Typography>
          <Typography sx={{ color: C.muted, fontSize: '0.875rem', mt: 0.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Configure your school's academic structure for the year before building timetables.
          </Typography>
        </Box>

        {/* Step tabs */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          {steps.map(s => (
            <StepTab
              key={s.key}
              step={s}
              active={activeStep === s.key}
              done={isDone[s.key]}
              onClick={() => setActiveStep(s.key)}
            />
          ))}
        </Box>

        {/* Step content */}
        {activeStep === 'year'     && <AcademicYearSection />}
        {activeStep === 'terms'    && <TermsSection />}
        {activeStep === 'periods'  && <PeriodsSection />}
        {activeStep === 'subjects' && <SubjectsSection />}
        {activeStep === 'classes'  && <ClassesSection />}

      </Container>

      <Snackbar
        open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SchoolSetupPage;




