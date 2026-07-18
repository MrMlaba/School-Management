import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  CircularProgress, Snackbar, Alert, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Switch, FormControlLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon      from '@mui/icons-material/Delete';
import SystemLayout, {
  FONT, TEAL, BORDER, CARD, INK, INK_SOFT, INK_FAINT, BG,
} from '../../components/system/SystemLayout';
import API_BASE from '../../config';

const token = () => sessionStorage.getItem('systemToken');
const authH = () => ({ Authorization: `Bearer ${token()}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

const ALL_STREAMS = ['Science', 'Commerce', 'Humanities'];
const ALL_GRADES  = [8, 9, 10, 11, 12];

const DEF_PERIODS = [
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

const STEPS = [
  { key: 'year',     label: 'Academic Year' },
  { key: 'terms',    label: 'Terms' },
  { key: 'periods',  label: 'Periods' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'classes',  label: 'Classes' },
];

// ── Shared style tokens ────────────────────────────────────────────────────────
const hc = {
  bgcolor: '#0D1E33', color: INK, fontWeight: 700, fontSize: '0.68rem',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: `2px solid ${TEAL}`, borderRight: `1px solid ${BORDER}`,
  padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: FONT,
};
const bc = {
  fontSize: '0.82rem', color: INK, borderBottom: `1px solid ${BORDER}`,
  borderRight: `1px solid ${BORDER}`, padding: '7px 12px', fontFamily: FONT,
};

export default function SystemSchoolSetup() {
  const schoolId   = sessionStorage.getItem('selectedSchoolId');
  const schoolName = sessionStorage.getItem('selectedSchoolName');

  const [step,     setStep]    = useState('year');
  const [summary,  setSummary] = useState(null);
  const [years,    setYears]   = useState([]);
  const [terms,    setTerms]   = useState([]);
  const [periods,  setPeriods] = useState([]);
  const [subjects, setSubjects]= useState([]);
  const [classes,  setClasses] = useState([]);
  const [natSubs,    setNatSubs]    = useState([]);
  const [saving,     setSaving]    = useState(false);
  const [snack,      setSnack]     = useState({ open: false, msg: '', sev: 'success' });
  const [schoolGrades,  setSchoolGrades]  = useState(ALL_GRADES);
  const [schoolStreams,  setSchoolStreams]  = useState(ALL_STREAMS);
  const [customName, setCustomName] = useState('');

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const BASE = `${API_BASE}/api/system/schools/${schoolId}`;

  const fetchSummary  = useCallback(async () => {
    const r = await fetch(`${BASE}/setup/summary`, { headers: authH() });
    if (r.ok) setSummary(await r.json());
  }, [BASE]);

  const fetchYears    = useCallback(async () => {
    const r = await fetch(`${BASE}/setup/academic-years`, { headers: authH() });
    if (r.ok) setYears(await r.json());
  }, [BASE]);

  const fetchTerms    = useCallback(async (yearId) => {
    if (!yearId) return;
    const r = await fetch(`${BASE}/setup/terms?academicYearId=${yearId}`, { headers: authH() });
    if (r.ok) setTerms(await r.json());
  }, [BASE]);

  const fetchPeriods  = useCallback(async () => {
    const r = await fetch(`${BASE}/setup/periods`, { headers: authH() });
    if (r.ok) setPeriods(await r.json());
  }, [BASE]);

  const fetchSubjects = useCallback(async (yearId) => {
    if (!yearId) return;
    const r = await fetch(`${BASE}/setup/subjects?academicYearId=${yearId}`, { headers: authH() });
    if (r.ok) setSubjects(await r.json());
  }, [BASE]);

  const fetchClasses  = useCallback(async (yearId) => {
    if (!yearId) return;
    const r = await fetch(`${BASE}/setup/classes?academicYearId=${yearId}`, { headers: authH() });
    if (r.ok) setClasses(await r.json());
  }, [BASE]);

  useEffect(() => {
    if (!schoolId) return;
    fetchSummary();
    fetchYears();
    fetchPeriods();
    // Load school's configured grades and streams
    fetch(`${BASE}/config`, { headers: authH() })
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (!cfg) return;
        if (Array.isArray(cfg.grades) && cfg.grades.length > 0) {
          const nums = cfg.grades.map(g => parseInt(g.toString().replace(/\D/g, ''))).filter(Boolean);
          if (nums.length > 0) setSchoolGrades(nums.sort((a, b) => a - b));
        }
        if (Array.isArray(cfg.streams) && cfg.streams.length > 0) {
          setSchoolStreams(cfg.streams);
        }
      })
      .catch(() => {});
  }, [fetchSummary, fetchYears, fetchPeriods, schoolId, BASE]);

  useEffect(() => {
    if (summary?.currentYearId) {
      fetchTerms(summary.currentYearId);
      fetchSubjects(summary.currentYearId);
      fetchClasses(summary.currentYearId);
    }
  }, [summary?.currentYearId, fetchTerms, fetchSubjects, fetchClasses]);

  const isDone = {
    year:    !!summary?.hasCurrentYear,
    terms:   summary?.terms >= 4,
    periods: summary?.periods > 0,
    subjects:summary?.subjects > 0,
    classes: summary?.classes > 0,
  };

  // ── Academic Year ────────────────────────────────────────────────────────────
  const [newYear, setNewYear] = useState(String(new Date().getFullYear() + 1));

  const handleCreateYear = async () => {
    setSaving(true);
    const r = await fetch(`${BASE}/setup/academic-years`, {
      method: 'POST', headers: jsonH(), body: JSON.stringify({ year: parseInt(newYear) }),
    });
    setSaving(false);
    if (r.ok) { toast(`Year ${newYear} set`); fetchYears(); fetchSummary(); }
    else { const e = await r.json(); toast(e.message || 'Failed', 'error'); }
  };

  // ── Terms ────────────────────────────────────────────────────────────────────
  const [tDates, setTDates] = useState({ 1: { s: '', e: '' }, 2: { s: '', e: '' }, 3: { s: '', e: '' }, 4: { s: '', e: '' } });
  useEffect(() => {
    const m = {};
    terms.forEach(t => { m[t.term_number] = { s: t.start_date?.slice(0, 10) || '', e: t.end_date?.slice(0, 10) || '' }; });
    setTDates(p => ({ ...p, ...m }));
  }, [terms]);

  const saveTerm = async (n) => {
    if (!summary?.currentYearId) return toast('Set academic year first', 'error');
    const d = tDates[n]; if (!d.s || !d.e) return toast('Both dates required', 'error');
    setSaving(true);
    const r = await fetch(`${BASE}/setup/terms`, {
      method: 'POST', headers: jsonH(),
      body: JSON.stringify({ academicYearId: summary.currentYearId, termNumber: n, startDate: d.s, endDate: d.e }),
    });
    setSaving(false);
    if (r.ok) { toast(`Term ${n} saved`); fetchTerms(summary.currentYearId); fetchSummary(); }
    else { const e = await r.json(); toast(e.message || 'Failed', 'error'); }
  };

  // ── Periods ──────────────────────────────────────────────────────────────────
  const [pRows, setPRows] = useState([]);
  useEffect(() => {
    if (periods.length > 0)
      setPRows(periods.map(p => ({ periodNumber: p.period_number, name: p.name, timeStart: p.time_start?.slice(0, 5) || '', timeEnd: p.time_end?.slice(0, 5) || '', isBreak: p.is_break })));
    else setPRows(DEF_PERIODS);
  }, [periods]);

  const savePeriods = async () => {
    setSaving(true);
    const r = await fetch(`${BASE}/setup/periods`, {
      method: 'PUT', headers: jsonH(), body: JSON.stringify({ periods: pRows }),
    });
    setSaving(false);
    if (r.ok) { toast('Periods saved'); fetchPeriods(); fetchSummary(); }
    else { const e = await r.json(); toast(e.message || 'Failed', 'error'); }
  };

  // ── Subjects ─────────────────────────────────────────────────────────────────
  const [addGrade,  setAddGrade]  = useState('');
  const [addStream, setAddStream] = useState('');
  const [selNat,    setSelNat]    = useState([]);

  useEffect(() => {
    if (!addGrade) { setNatSubs([]); return; }
    let url = `${BASE}/setup/national-subjects?grade=${addGrade}`;
    if (parseInt(addGrade) >= 10 && addStream) url += `&stream=${addStream}`;
    fetch(url, { headers: authH() }).then(r => r.ok ? r.json() : []).then(setNatSubs).catch(() => {});
  }, [addGrade, addStream, BASE]);

  const added     = new Set(subjects.filter(s => s.grade === parseInt(addGrade) && (s.stream === addStream || (!s.stream && !addStream))).map(s => s.national_subject_id));
  const available = natSubs.filter(ns => !added.has(ns.id));

  const addSubjects = async () => {
    if (!selNat.length) return toast('Select at least one subject', 'error');
    if (!summary?.currentYearId) return toast('Set academic year first', 'error');
    setSaving(true);
    const payload = selNat.map(id => ({
      academicYearId: summary.currentYearId,
      nationalSubjectId: id,
      grade: parseInt(addGrade),
      stream: parseInt(addGrade) >= 10 ? addStream || null : null,
    }));
    const r = await fetch(`${BASE}/setup/subjects`, {
      method: 'POST', headers: jsonH(), body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) { toast(`${selNat.length} subject(s) added`); setSelNat([]); fetchSubjects(summary.currentYearId); fetchSummary(); }
    else { const e = await r.json(); toast(e.message || 'Failed', 'error'); }
  };

  const removeSubject = async (id) => {
    await fetch(`${BASE}/setup/subjects/${id}`, { method: 'DELETE', headers: authH() });
    toast('Subject removed'); fetchSubjects(summary.currentYearId); fetchSummary();
  };

  const addCustomSubject = async () => {
    if (!customName.trim()) return toast('Enter a subject name', 'error');
    if (!addGrade) return toast('Select a grade first', 'error');
    if (!summary?.currentYearId) return toast('Set academic year first', 'error');
    setSaving(true);
    const r = await fetch(`${BASE}/setup/subjects/custom`, {
      method: 'POST', headers: jsonH(),
      body: JSON.stringify({
        name: customName.trim(),
        grade: parseInt(addGrade),
        stream: parseInt(addGrade) >= 10 ? addStream || null : null,
        academicYearId: summary.currentYearId,
      }),
    });
    setSaving(false);
    if (r.ok) { toast(`"${customName.trim()}" added`); setCustomName(''); fetchSubjects(summary.currentYearId); fetchSummary(); }
    else { const e = await r.json(); toast(e.message || 'Failed', 'error'); }
  };

  // ── Classes ──────────────────────────────────────────────────────────────────
  const [clsForm, setClsForm] = useState({ grade: '', stream: '', letter: '', capacity: 40 });

  const addClass = async () => {
    if (!clsForm.grade || !clsForm.letter) return toast('Grade and letter required', 'error');
    if (!summary?.currentYearId) return toast('Set academic year first', 'error');
    if (parseInt(clsForm.grade) >= 10 && !clsForm.stream) return toast('Stream required for Gr 10–12', 'error');
    setSaving(true);
    const r = await fetch(`${BASE}/setup/classes`, {
      method: 'POST', headers: jsonH(),
      body: JSON.stringify({
        academicYearId: summary.currentYearId,
        grade: parseInt(clsForm.grade),
        stream: parseInt(clsForm.grade) >= 10 ? clsForm.stream : null,
        letter: clsForm.letter,
        capacity: clsForm.capacity,
      }),
    });
    setSaving(false);
    if (r.ok) { toast(`Class ${clsForm.grade}${clsForm.letter} created`); fetchClasses(summary.currentYearId); fetchSummary(); }
    else { const e = await r.json(); toast(e.message || 'Failed', 'error'); }
  };

  const removeClass = async (id, name) => {
    await fetch(`${BASE}/setup/classes/${id}`, { method: 'DELETE', headers: authH() });
    toast(`Class ${name} removed`); fetchClasses(summary.currentYearId); fetchSummary();
  };

  if (!schoolId) {
    return (
      <SystemLayout title="School Setup">
        <Box sx={{ p: 4, color: INK_SOFT, fontFamily: FONT }}>
          Select a school from the dropdown first.
        </Box>
      </SystemLayout>
    );
  }

  return (
    <SystemLayout title="School Setup" subtitle={schoolName}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>

        {/* Step tabs */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          {STEPS.map(s => (
            <Button key={s.key} onClick={() => setStep(s.key)} size="small"
              sx={{
                textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', fontFamily: FONT,
                background: step === s.key ? TEAL : 'transparent',
                color: step === s.key ? '#fff' : isDone[s.key] ? '#10B981' : INK_SOFT,
                border: step === s.key ? `1.5px solid ${TEAL}` : `1.5px solid ${BORDER}`,
                borderRadius: '6px', px: 1.75, py: 0.6,
                '&:hover': { background: step === s.key ? TEAL : 'rgba(255,255,255,0.06)' },
              }}
            >
              {isDone[s.key] && step !== s.key && <CheckCircleIcon sx={{ fontSize: 13, mr: 0.5 }} />}
              {s.label}
            </Button>
          ))}
        </Box>

        {/* ── YEAR ── */}
        {step === 'year' && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
              <TextField
                label="Year" value={newYear} onChange={e => setNewYear(e.target.value)}
                size="small" type="number" sx={{ width: 140 }} inputProps={{ min: 2024, max: 2035 }}
              />
              <Button variant="contained" onClick={handleCreateYear} disabled={saving}
                sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
                {saving ? 'Setting…' : 'Set Academic Year'}
              </Button>
            </Box>
            {years.map(y => (
              <Box key={y.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: FONT, color: INK }}>{y.year}</Typography>
                {y.is_current && <Chip label="Current" size="small" sx={{ bgcolor: `${TEAL}22`, color: TEAL, fontWeight: 700, fontSize: '0.62rem' }} />}
              </Box>
            ))}
          </Box>
        )}

        {/* ── TERMS ── */}
        {step === 'terms' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!summary?.hasCurrentYear && (
              <Typography sx={{ color: '#F59E0B', fontFamily: FONT, fontSize: '0.8rem' }}>Set academic year first.</Typography>
            )}
            {[1, 2, 3, 4].map(n => {
              const saved = terms.find(t => t.term_number === n);
              return (
                <Box key={n} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: '8px', bgcolor: CARD }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: FONT, color: INK }}>Term {n}</Typography>
                    {saved && <Chip label="Saved" size="small" sx={{ bgcolor: '#10B98120', color: '#10B981', fontSize: '0.6rem', fontWeight: 700 }} />}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField label="Start" type="date" size="small"
                      value={tDates[n]?.s || ''} onChange={e => setTDates(p => ({ ...p, [n]: { ...p[n], s: e.target.value } }))}
                      InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                    <TextField label="End" type="date" size="small"
                      value={tDates[n]?.e || ''} onChange={e => setTDates(p => ({ ...p, [n]: { ...p[n], e: e.target.value } }))}
                      InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                    <Button variant="outlined" size="small" onClick={() => saveTerm(n)} disabled={saving}
                      sx={{ borderColor: TEAL, color: TEAL, textTransform: 'none', fontWeight: 700, fontFamily: FONT }}>
                      Save Term {n}
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* ── PERIODS ── */}
        {step === 'periods' && (
          <Box>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', mb: 2, bgcolor: CARD }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['#', 'Name', 'Start', 'End', 'Break'].map(h => (
                      <TableCell key={h} sx={hc}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pRows.map((p, i) => (
                    <TableRow key={p.periodNumber}>
                      <TableCell sx={{ ...bc, width: 40, textAlign: 'center', color: INK_FAINT }}>{p.periodNumber}</TableCell>
                      <TableCell sx={bc}>
                        <TextField value={p.name} size="small" variant="standard"
                          onChange={e => setPRows(r => r.map((row, j) => j === i ? { ...row, name: e.target.value } : row))}
                          sx={{ '& input': { fontFamily: FONT, fontSize: '0.8rem', color: INK } }} />
                      </TableCell>
                      <TableCell sx={bc}>
                        <TextField type="time" value={p.timeStart} size="small" variant="standard"
                          onChange={e => setPRows(r => r.map((row, j) => j === i ? { ...row, timeStart: e.target.value } : row))}
                          sx={{ '& input': { fontFamily: FONT, fontSize: '0.8rem', color: INK } }} />
                      </TableCell>
                      <TableCell sx={bc}>
                        <TextField type="time" value={p.timeEnd} size="small" variant="standard"
                          onChange={e => setPRows(r => r.map((row, j) => j === i ? { ...row, timeEnd: e.target.value } : row))}
                          sx={{ '& input': { fontFamily: FONT, fontSize: '0.8rem', color: INK } }} />
                      </TableCell>
                      <TableCell sx={bc}>
                        <Switch size="small" checked={p.isBreak}
                          onChange={e => setPRows(r => r.map((row, j) => j === i ? { ...row, isBreak: e.target.checked } : row))}
                          sx={{ '& .MuiSwitch-thumb': { bgcolor: p.isBreak ? TEAL : INK_FAINT } }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button variant="contained" onClick={savePeriods} disabled={saving}
              sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
              {saving ? 'Saving…' : 'Save Periods'}
            </Button>
          </Box>
        )}

        {/* ── SUBJECTS ── */}
        {step === 'subjects' && (
          <Box>
            {!summary?.hasCurrentYear && (
              <Typography sx={{ color: '#F59E0B', fontFamily: FONT, fontSize: '0.8rem', mb: 2 }}>Set academic year first.</Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <TextField select label="Grade" value={addGrade} onChange={e => { setAddGrade(e.target.value); setAddStream(''); setSelNat([]); setCustomName(''); }} size="small" sx={{ width: 110 }}>
                {schoolGrades.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
              </TextField>
              {parseInt(addGrade) >= 10 && (
                <TextField select label="Stream" value={addStream} onChange={e => { setAddStream(e.target.value); setSelNat([]); }} size="small" sx={{ width: 140 }}>
                  <MenuItem value="">— All streams —</MenuItem>
                  {schoolStreams.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              )}
            </Box>
            {addGrade && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mb: 1 }}>Select from national subjects:</Typography>
                {available.length === 0
                  ? <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: INK_FAINT, mb: 1 }}>All national subjects for this grade/stream are already added.</Typography>
                  : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                      {available.map(ns => (
                        <Chip key={ns.id} label={ns.name}
                          onClick={() => setSelNat(s => s.includes(ns.id) ? s.filter(x => x !== ns.id) : [...s, ns.id])}
                          variant={selNat.includes(ns.id) ? 'filled' : 'outlined'}
                          sx={{
                            fontSize: '0.72rem', fontFamily: FONT, cursor: 'pointer',
                            bgcolor: selNat.includes(ns.id) ? TEAL : 'transparent',
                            color: selNat.includes(ns.id) ? '#fff' : INK_SOFT,
                            borderColor: selNat.includes(ns.id) ? TEAL : BORDER,
                          }} />
                      ))}
                    </Box>
                  )}
                {available.length > 0 && (
                  <Button variant="contained" size="small" onClick={addSubjects} disabled={!selNat.length || saving}
                    sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none', mb: 2 }}>
                    {saving ? 'Adding…' : `Add ${selNat.length || ''} Subject${selNat.length !== 1 ? 's' : ''}`}
                  </Button>
                )}

                {/* Custom subject */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, whiteSpace: 'nowrap' }}>Custom subject:</Typography>
                  <TextField
                    size="small" placeholder="Type subject name…" value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
                    sx={{ flex: 1, '& input': { fontFamily: FONT, fontSize: '0.8rem', color: INK } }}
                    InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.04)' } }}
                  />
                  <Button variant="outlined" size="small" onClick={addCustomSubject} disabled={!customName.trim() || saving}
                    sx={{ borderColor: TEAL, color: TEAL, textTransform: 'none', fontWeight: 700, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                    Add Custom
                  </Button>
                </Box>
              </Box>
            )}
            <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mb: 1, mt: 2 }}>Added subjects:</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', bgcolor: CARD }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Subject', 'Code', 'Grade', 'Stream', ''].map(h => (
                      <TableCell key={h} sx={hc}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.length === 0
                    ? <TableRow><TableCell colSpan={5} sx={{ ...bc, color: INK_FAINT, textAlign: 'center' }}>No subjects added yet.</TableCell></TableRow>
                    : subjects.map(s => (
                      <TableRow key={s.id}>
                        <TableCell sx={{ ...bc, fontWeight: 600 }}>{s.name}</TableCell>
                        <TableCell sx={{ ...bc, fontFamily: 'monospace', fontSize: '0.72rem' }}>{s.national_code || s.code}</TableCell>
                        <TableCell sx={bc}>Grade {s.grade}</TableCell>
                        <TableCell sx={bc}>{s.stream || '—'}</TableCell>
                        <TableCell sx={{ ...bc, borderRight: 'none' }}>
                          <Tooltip title="Remove">
                            <IconButton size="small" onClick={() => removeSubject(s.id)} sx={{ color: '#EF4444' }}>
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── CLASSES ── */}
        {step === 'classes' && (
          <Box>
            {!summary?.hasCurrentYear && (
              <Typography sx={{ color: '#F59E0B', fontFamily: FONT, fontSize: '0.8rem', mb: 2 }}>Set academic year first.</Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <TextField select label="Grade" value={clsForm.grade} onChange={e => setClsForm(f => ({ ...f, grade: e.target.value, stream: '' }))} size="small" sx={{ width: 110 }}>
                {schoolGrades.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
              </TextField>
              {parseInt(clsForm.grade) >= 10 && (
                <TextField select label="Stream" value={clsForm.stream} onChange={e => setClsForm(f => ({ ...f, stream: e.target.value }))} size="small" sx={{ width: 140 }}>
                  {schoolStreams.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              )}
              <TextField label="Letter (A, B…)" value={clsForm.letter} onChange={e => setClsForm(f => ({ ...f, letter: e.target.value.toUpperCase() }))} size="small" sx={{ width: 130 }} inputProps={{ maxLength: 2 }} />
              <TextField label="Capacity" type="number" value={clsForm.capacity} onChange={e => setClsForm(f => ({ ...f, capacity: parseInt(e.target.value) || 40 }))} size="small" sx={{ width: 100 }} inputProps={{ min: 1, max: 100 }} />
              <Button variant="contained" onClick={addClass} disabled={saving}
                sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
                {saving ? 'Adding…' : 'Add Class'}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {classes.length === 0
                ? <Typography sx={{ color: INK_FAINT, fontFamily: FONT }}>No classes added yet.</Typography>
                : classes.map(cls => (
                  <Box key={cls.id} sx={{ width: 130, p: 2, borderRadius: '8px', border: `1px solid ${BORDER}`, bgcolor: CARD, textAlign: 'center', position: 'relative' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: INK, lineHeight: 1, fontFamily: FONT }}>{cls.name}</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: INK_FAINT, mt: 0.5, fontFamily: FONT }}>Grade {cls.grade}</Typography>
                    {cls.stream && <Chip label={cls.stream} size="small" sx={{ mt: 0.75, fontSize: '0.58rem', fontWeight: 700, bgcolor: `${TEAL}20`, color: TEAL }} />}
                    <Typography sx={{ fontSize: '0.6rem', color: INK_FAINT, mt: 0.5, fontFamily: FONT }}>{cls.enrolled_count || 0} enrolled</Typography>
                    <Tooltip title="Remove class">
                      <IconButton size="small" onClick={() => removeClass(cls.id, cls.name)}
                        sx={{ position: 'absolute', top: 4, right: 4, color: '#EF4444', opacity: 0.7, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
            </Box>
          </Box>
        )}

      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: FONT }}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
}
