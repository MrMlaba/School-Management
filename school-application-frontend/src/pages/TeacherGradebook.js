import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, CircularProgress,
  IconButton, Tooltip, Chip, Paper, TableContainer
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { createTheme, ThemeProvider } from '@mui/material/styles';

/* ─── Google Font import ─────────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap';
document.head.appendChild(fontLink);

/* ─── Inline global styles ───────────────────────────────────────────────── */
const styleEl = document.createElement('style');
styleEl.textContent = `
  :root {
    --navy: #0f1c2e;
    --navy-mid: #1a2d45;
    --navy-light: #243b55;
    --accent: #4f8ef7;
    --accent-hover: #6fa4ff;
    --accent-dim: rgba(79,142,247,0.12);
    --success: #22c98a;
    --surface: #ffffff;
    --surface-alt: #f6f8fc;
    --border: #e4e9f2;
    --text-primary: #0f1c2e;
    --text-secondary: #6b7a99;
    --text-muted: #a0abbd;
    --shadow-sm: 0 1px 4px rgba(15,28,46,0.07);
    --shadow-md: 0 4px 20px rgba(15,28,46,0.10);
    --shadow-lg: 0 8px 40px rgba(15,28,46,0.13);
    --radius: 12px;
    --radius-sm: 8px;
  }

  * { box-sizing: border-box; }

  body, .MuiTypography-root, .MuiButton-root, .MuiTableCell-root, .MuiInputBase-root {
    font-family: 'DM Sans', sans-serif !important;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--surface-alt); }
  ::-webkit-scrollbar-thumb { background: #c4cede; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

  /* Row hover */
  .gb-row:hover td { background: #f0f5ff !important; }
  .gb-row td { transition: background 0.15s ease; }

  /* Mark cell input */
  .gb-input .MuiOutlinedInput-root {
    border-radius: var(--radius-sm);
    background: var(--surface-alt);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    transition: box-shadow 0.15s, background 0.15s;
  }
  .gb-input .MuiOutlinedInput-root:hover {
    background: #e8eeff;
  }
  .gb-input .MuiOutlinedInput-root.Mui-focused {
    background: #fff;
    box-shadow: 0 0 0 3px rgba(79,142,247,0.2);
  }
  .gb-input .MuiOutlinedInput-notchedOutline {
    border-color: var(--border) !important;
  }
  .gb-input .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
    border-color: var(--accent) !important;
  }

  /* Save All button pulse on hover */
  .save-all-btn:hover { box-shadow: 0 0 0 4px rgba(79,142,247,0.2) !important; }

  /* Assignment header cell */
  .asn-header { cursor: default; }
  .asn-icon-btn { opacity: 0.45; transition: opacity 0.15s, color 0.15s !important; }
  .asn-icon-btn:hover { opacity: 1 !important; }

  /* Fade-in animation */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .gb-fadeup { animation: fadeUp 0.35s ease both; }

  /* Percentage pill */
  .pct-pill {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 99px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .pct-high { background: rgba(34,201,138,0.13); color: #13a06a; }
  .pct-mid  { background: rgba(250,176,5,0.13);  color: #c47f00; }
  .pct-low  { background: rgba(239,68,68,0.13);  color: #c02020; }
  .pct-none { background: var(--surface-alt);    color: var(--text-muted); }
`;
document.head.appendChild(styleEl);

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function pctClass(val) {
  if (val == null || isNaN(val)) return 'pct-none';
  if (val >= 70) return 'pct-high';
  if (val >= 40) return 'pct-mid';
  return 'pct-low';
}

function PctPill({ value, totalMarks }) {
  if (!value || !totalMarks) return <span className="pct-pill pct-none">—</span>;
  const num = parseFloat(value);
  if (isNaN(num)) return <span className="pct-pill pct-none">—</span>;
  const pct = (num / totalMarks) * 100;
  return <span className={`pct-pill ${pctClass(pct)}`}>{pct.toFixed(1)}%</span>;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
const BASE = 'https://school-management-production-6167.up.railway.app';

export default function TeacherGradebook() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState({});
  const [drafts, setDrafts] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState(classId || '');

  useEffect(() => {
    if (!classId) return navigate('/teacher/dashboard');
    load();
    // eslint-disable-next-line
  }, [classId]);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('teacherToken');
      const res = await fetch(`${BASE}/api/teacher/marks-table?classId=${classId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
      const initial = {};
      (json.students || []).forEach(s => {
        initial[s.id] = {};
        (json.assignments || []).forEach(a => {
          const m = s.marks?.[String(a.id)];
          if (m && m.marksObtained != null) initial[s.id][a.id] = String(m.marksObtained);
        });
      });
      setDrafts(initial);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  // load teacher classes (grades assigned)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('teacherToken');
        const res = await fetch(`${BASE}/api/teacher/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const d = await res.json();
        if (!mounted) return;
        setMyClasses(d.myClasses || []);
        // if classId provided, set grade accordingly
        if (classId) {
          const cls = (d.myClasses||[]).find(c => String(c.id) === String(classId));
          if (cls) { setSelectedGrade(cls.grade); setSelectedClass(String(cls.id)); }
        } else if ((d.myClasses||[]).length === 1) {
          setSelectedGrade(d.myClasses[0].grade);
          setSelectedClass(String(d.myClasses[0].id));
        }
      } catch (err) { console.error(err); }
    })();
    return () => { mounted = false; };
  }, [classId]);

  const startEdit = (studentId, assignmentId, current) => {
    setEditing({ studentId, assignmentId, value: current ?? '' });
  };

  const updateDraft = (studentId, assignmentId, value) => {
    setDrafts(d => ({ ...d, [studentId]: { ...d[studentId], [assignmentId]: value } }));
  };

  const saveEdit = async () => {
    const token = localStorage.getItem('teacherToken');
    const { studentId, assignmentId, value } = editing;
    if (!studentId || !assignmentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/teacher/assignments/${assignmentId}/submissions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, marksObtained: value })
      });
      if (!res.ok) throw new Error('Failed to save');
      await load();
      setEditing({});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveCell = async (studentId, assignmentId) => {
    const token = localStorage.getItem('teacherToken');
    const value = drafts?.[studentId]?.[assignmentId];
    if (value === undefined) return;
    try {
      const res = await fetch(`${BASE}/api/teacher/assignments/${assignmentId}/submissions/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, marksObtained: value })
      });
      if (!res.ok) throw new Error('Failed to save');
      await load();
    } catch (err) { console.error(err); }
  };

  const saveAll = async () => {
    if (!data) return;
    setSavingAll(true);
    const token = localStorage.getItem('teacherToken');
    try {
      const promises = [];
      Object.entries(drafts).forEach(([studentId, assigns]) => {
        Object.entries(assigns).forEach(([assignmentId, val]) => {
          if (val === '' || val == null) return;
          promises.push(fetch(`${BASE}/api/teacher/assignments/${assignmentId}/submissions/create`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ studentId: Number(studentId), marksObtained: val })
          }));
        });
      });
      await Promise.all(promises);
      await load();
    } catch (err) { console.error(err); }
    finally { setSavingAll(false); }
  };

  const exportCSV = (assignmentId) => {
    window.open(`${BASE}/api/teacher/assignments/${assignmentId}/export`, '_blank');
  };

  const handleImport = async (e, assignmentId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('teacherToken');
    const fd = new FormData(); fd.append('file', file);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/teacher/assignments/${assignmentId}/import`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (!res.ok) throw new Error('Import failed');
      await load();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  /* ── Loading / empty states ── */
  if (loading) return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 2,
      background: 'linear-gradient(135deg, #f6f8fc 0%, #eef2fb 100%)'
    }}>
      <CircularProgress size={38} thickness={4} sx={{ color: 'var(--accent)' }} />
      <Typography sx={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans', fontWeight: 500 }}>
        Loading gradebook…
      </Typography>
    </Box>
  );

  if (!data) return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <Typography sx={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>No data available</Typography>
    </Box>
  );

  const { class: cls, assignments, students } = data;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f4f7fd 0%, #eaf0fb 100%)',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* ── Top Bar ── */}
      <Box sx={{
        background: 'var(--navy)',
        px: { xs: 2, md: 4 },
        py: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 64,
        boxShadow: '0 2px 16px rgba(15,28,46,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Left: back + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title="Go back">
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.55)',
                border: '1.5px solid rgba(255,255,255,0.14)',
                borderRadius: '8px',
                p: '5px',
                transition: 'all 0.15s',
                '&:hover': { color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.07)' }
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Vertical divider */}
          <Box sx={{ width: 1.5, height: 28, background: 'rgba(255,255,255,0.12)', borderRadius: 99, mx: 0.5 }} />

          <Box>
            <Typography sx={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: '#fff',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              {cls?.name || 'Gradebook'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 400, letterSpacing: '0.03em' }}>
              GRADEBOOK
            </Typography>
          </Box>

          <Box sx={{
            ml: 1.5,
            px: 1.5,
            py: 0.4,
            background: 'rgba(79,142,247,0.18)',
            border: '1px solid rgba(79,142,247,0.35)',
            borderRadius: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.02em' }}>
              {students.length} {students.length === 1 ? 'student' : 'students'}
            </Typography>
          </Box>
          {/* Grade and class filters (only classes assigned to this teacher) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 2 }}>
            <TextField
              select
              size="small"
              value={selectedGrade}
              onChange={(e) => { setSelectedGrade(e.target.value); setSelectedClass(''); }}
              sx={{ minWidth: 140, background: 'rgba(255,255,255,0.03)', borderRadius: 1 }}
              SelectProps={{ native: true }}
            >
              <option value="">Filter grade</option>
              {[...new Set((myClasses || []).map(c => c.grade).filter(g => g != null))].map(g => (
                <option key={g} value={g}>{`Grade ${g}`}</option>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); if (e.target.value) navigate(`/teacher/gradebook/${e.target.value}`); }}
              sx={{ minWidth: 220, background: 'rgba(255,255,255,0.03)', borderRadius: 1 }}
              SelectProps={{ native: true }}
            >
              <option value="">Select class</option>
              {(myClasses || []).filter(c => !selectedGrade || String(c.grade) === String(selectedGrade)).map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.stream ? ` (${c.stream})` : ''}</option>
              ))}
            </TextField>
          </Box>
        </Box>

        {/* Right: Save All */}
        <Tooltip title="Save all edited marks">
          <span>
            <Button
              className="save-all-btn"
              variant="contained"
              startIcon={savingAll
                ? <CircularProgress size={14} thickness={5} sx={{ color: '#fff' }} />
                : <SaveIcon sx={{ fontSize: '16px !important' }} />}
              onClick={saveAll}
              disabled={savingAll}
              sx={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #3a7dff 100%)',
                color: '#fff',
                fontFamily: 'DM Sans',
                fontWeight: 600,
                fontSize: '0.82rem',
                textTransform: 'none',
                borderRadius: '9px',
                px: 2.5,
                py: 1,
                boxShadow: '0 2px 12px rgba(79,142,247,0.35)',
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
                '&:hover': {
                  background: 'linear-gradient(135deg, var(--accent-hover) 0%, #4a8bff 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 18px rgba(79,142,247,0.45)',
                },
                '&:disabled': { background: 'rgba(79,142,247,0.35)', color: 'rgba(255,255,255,0.6)' }
              }}
            >
              {savingAll ? 'Saving…' : 'Save All'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* ── Table Area ── */}
      <Box sx={{ p: { xs: 2, md: 3 }, pt: { xs: 2.5, md: 3 } }} className="gb-fadeup">
        <Paper elevation={0} sx={{
          borderRadius: 'var(--radius)',
          border: '1.5px solid var(--border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          background: 'var(--surface)',
        }}>
          <TableContainer sx={{
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: '6px' },
            '&::-webkit-scrollbar-thumb': { background: '#c4cede', borderRadius: '99px' },
          }}>
            <Table sx={{ minWidth: 700, borderCollapse: 'separate', borderSpacing: 0 }}>

              {/* ── HEAD ── */}
              <TableHead>
                <TableRow>
                  {/* Student col header */}
                  <TableCell sx={{
                    position: 'sticky', left: 0, zIndex: 4,
                    background: 'var(--navy)',
                    borderBottom: '2px solid rgba(255,255,255,0.07)',
                    minWidth: 230,
                    py: 2, px: 2.5,
                  }}>
                    <Typography sx={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      color: 'rgba(255,255,255,0.55)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}>Student</Typography>
                  </TableCell>

                  {/* Assignment col headers */}
                  {assignments.map((a, idx) => (
                    <TableCell key={a.id} align="center" className="asn-header" sx={{
                      background: 'var(--navy)',
                      borderBottom: '2px solid rgba(255,255,255,0.07)',
                      borderLeft: '1px solid rgba(255,255,255,0.05)',
                      minWidth: 150,
                      py: 2, px: 1.5,
                    }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{
                          fontFamily: 'DM Sans',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: '#fff',
                          letterSpacing: '-0.01em',
                          lineHeight: 1.3,
                          textAlign: 'center',
                        }}>
                          {a.title}
                        </Typography>
                        {a.totalMarks && (
                          <Box sx={{
                            px: 1, py: '2px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: 99,
                          }}>
                            <Typography sx={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                              out of {a.totalMarks}
                            </Typography>
                          </Box>
                        )}
                        {/* Action icons */}
                        <Box sx={{ display: 'flex', gap: 0.25, mt: 0.25 }}>
                          <Tooltip title="Export CSV">
                            <IconButton
                              size="small"
                              className="asn-icon-btn"
                              onClick={() => exportCSV(a.id)}
                              sx={{ color: 'rgba(255,255,255,0.7)', p: '4px', borderRadius: '6px', '&:hover': { background: 'rgba(255,255,255,0.1)' } }}
                            >
                              <DownloadIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <input type="file" accept=".csv" style={{ display: 'none' }} id={`imp-${a.id}`} onChange={(e) => handleImport(e, a.id)} />
                          <label htmlFor={`imp-${a.id}`}>
                            <Tooltip title="Import CSV">
                              <IconButton
                                size="small"
                                component="span"
                                className="asn-icon-btn"
                                sx={{ color: 'rgba(255,255,255,0.7)', p: '4px', borderRadius: '6px', '&:hover': { background: 'rgba(255,255,255,0.1)' } }}
                              >
                                <UploadFileIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </label>
                        </Box>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              {/* ── BODY ── */}
              <TableBody>
                {students.map((s, rowIdx) => (
                  <TableRow
                    key={s.id}
                    className="gb-row"
                    sx={{ '&:last-child td': { borderBottom: 'none' } }}
                  >
                    {/* Student info cell */}
                    <TableCell sx={{
                      position: 'sticky', left: 0, zIndex: 2,
                      background: 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                      borderRight: '2px solid var(--border)',
                      py: 1.5, px: 2.5,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Avatar bubble */}
                        <Box sx={{
                          width: 34, height: 34, borderRadius: '10px',
                          background: `hsl(${(rowIdx * 47 + 200) % 360}, 60%, 92%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Typography sx={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: `hsl(${(rowIdx * 47 + 200) % 360}, 50%, 35%)`,
                            letterSpacing: '0.02em',
                            fontFamily: 'DM Sans',
                          }}>
                            {(s.firstName?.[0] ?? '') + (s.lastName?.[0] ?? '')}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.3,
                          }}>
                            {s.lastName}, {s.firstName}
                          </Typography>
                          <Typography sx={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            mt: '1px',
                          }}>
                            {s.studentNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Mark cells */}
                    {assignments.map(a => (
                      <TableCell key={a.id} align="center" sx={{
                        borderBottom: '1px solid var(--border)',
                        borderLeft: '1px solid #f0f3fa',
                        py: 1.25, px: 1.5,
                      }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6 }}>
                          <TextField
                            className="gb-input"
                            size="small"
                            type="number"
                            inputProps={{ min: 0, max: a.totalMarks || 9999, step: 0.5 }}
                            value={drafts?.[s.id]?.[a.id] ?? ''}
                            onChange={(e) => updateDraft(s.id, a.id, e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') { await saveCell(s.id, a.id); }
                              if (e.key === 'Escape') {
                                setDrafts(d => ({
                                  ...d,
                                  [s.id]: {
                                    ...d[s.id],
                                    [a.id]: (s.marks?.[String(a.id)]?.marksObtained ?? '')
                                  }
                                }));
                              }
                            }}
                            sx={{ width: 86 }}
                          />
                          <PctPill
                            value={drafts?.[s.id]?.[a.id]}
                            totalMarks={a.totalMarks}
                          />
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Empty state row */}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={assignments.length + 1} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '0.9rem' }}>
                        No students enrolled in this class.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ── Footer summary bar ── */}
          <Box sx={{
            px: 2.5, py: 1.25,
            background: 'var(--surface-alt)',
            borderTop: '1.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}>
            <Typography sx={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 500, fontFamily: 'DM Sans' }}>
              {students.length} students · {assignments.length} assignments
            </Typography>
            <Typography sx={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
              Press <Box component="kbd" sx={{
                px: '5px', py: '1px', borderRadius: '4px', background: '#e8ecf6',
                border: '1px solid #d0d7e8', fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-secondary)'
              }}>Enter</Box> to save a cell · <Box component="kbd" sx={{
                px: '5px', py: '1px', borderRadius: '4px', background: '#e8ecf6',
                border: '1px solid #d0d7e8', fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-secondary)'
              }}>Esc</Box> to revert
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}




