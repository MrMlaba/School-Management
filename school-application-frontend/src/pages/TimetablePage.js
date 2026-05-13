import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Container, Chip, Divider,
  TextField, MenuItem, CircularProgress, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import DeleteIcon        from '@mui/icons-material/Delete';
import EditIcon          from '@mui/icons-material/Edit';
import CloseIcon         from '@mui/icons-material/Close';
import PeopleAltIcon     from '@mui/icons-material/PeopleAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon        from '@mui/icons-material/School';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';

/* ─── Tokens ─────────────────────────────────────────────────── */
const C = {
  brand:       '#1A3557',
  accent:      '#2E7D32',
  border:      '#D0D7DE',
  headerBg:    '#F0F4F8',
  rowHover:    '#F7FAFC',
  rowAlt:      '#FAFBFC',
  text:        '#1A2332',
  muted:       '#6B7C93',
  white:       '#FFFFFF',
  danger:      '#C62828',
  clash:       '#FFEBEE',
  clashBorder: '#EF9A9A',
  filled:      '#E8F5E9',
  filledBorder:'#A5D6A7',
};

const BASE  = 'https://school-management-production-6167.up.railway.app';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken')}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

/* ─── Table styles ───────────────────────────────────────────── */
const headCell = {
  backgroundColor: C.headerBg, color: C.brand, fontWeight: 700,
  fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: `2px solid ${C.brand}`, borderRight: `1px solid ${C.border}`,
  padding: '9px 14px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Sans', sans-serif",
};
const bodyCell = {
  fontSize: '0.855rem', color: C.text,
  borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
  padding: '8px 14px', fontFamily: "'IBM Plex Sans', sans-serif",
};

/* ─── Section wrapper ────────────────────────────────────────── */
const Section = ({ title, subtitle, children, action }) => (
  <Box sx={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', p: 3, mb: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.82rem', color: C.muted, mt: 0.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
    <Divider sx={{ mb: 2.5, borderColor: C.border }} />
    {children}
  </Box>
);

const TabBtn = ({ active, onClick, icon, label }) => (
  <Button onClick={onClick} sx={{
    display: 'flex', alignItems: 'center', gap: 1,
    px: 2.5, py: 1.25, borderRadius: '6px', textTransform: 'none',
    fontWeight: 700, fontSize: '0.88rem', fontFamily: "'IBM Plex Sans', sans-serif",
    background: active ? C.brand : 'transparent',
    color: active ? C.white : C.muted,
    border: active ? `1.5px solid ${C.brand}` : `1.5px solid ${C.border}`,
    '&:hover': { background: active ? C.brand : C.headerBg },
  }}>{icon}{label}</Button>
);

/* ═══════════════════════════════════════════════════════════════
   TEACHERS TAB
═══════════════════════════════════════════════════════════════ */
const TeachersTab = () => {
  const [teachers,       setTeachers]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [dialog,         setDialog]         = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [snack,          setSnack]          = useState({ open: false, msg: '', sev: 'success' });
  const [allNatSubjects, setAllNatSubjects] = useState([]);
  const [selSubjects,    setSelSubjects]    = useState([]);
  const [errors,         setErrors]         = useState({});

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const EMPTY = { firstName: '', lastName: '', email: '', phone: '', employeeNumber: '', gender: '' };
  const [form, setForm] = useState(EMPTY);

  /* ── Load national subjects once ─────────────────────────── */
  useEffect(() => {
    fetch(`${BASE}/api/setup/national-subjects`, { headers: authH() })
      .then(r => r.ok ? r.json() : [])
      .then(setAllNatSubjects)
      .catch(() => {});
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/management/teachers`, { headers: authH() });
    if (res.ok) setTeachers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  /* ── Validation ──────────────────────────────────────────── */
  const validate = () => {
    const e = {};
    if (!form.firstName?.trim())              e.firstName = 'First name is required';
    else if (form.firstName.trim().length < 2) e.firstName = 'At least 2 characters';
    if (!form.lastName?.trim())               e.lastName  = 'Last name is required';
    else if (form.lastName.trim().length < 2)  e.lastName  = 'At least 2 characters';
    if (form.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        e.email = 'Enter a valid email address';
    }
    if (!form.phone?.trim()) {
      e.phone = 'Phone number is required';
    } else if (form.phone.replace(/\D/g, '').length !== 10) {
      e.phone = 'Phone must be exactly 10 digits';
    }
    if (form.employeeNumber?.trim() && form.employeeNumber.trim().length < 2)
      e.employeeNumber = 'Too short';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Dialog open helpers ─────────────────────────────────── */
  const openAdd = () => {
    setEditing(null); setForm(EMPTY);
    setSelSubjects([]); setErrors({});
    setDialog(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ firstName: t.firstName, lastName: t.lastName, email: t.email||'', phone: t.phone||'', employeeNumber: t.employeeNumber||'', gender: t.gender||'' });
    setSelSubjects((t.subjects||[]).map(s => s.id));
    setErrors({});
    setDialog(true);
  };

  /* ── Save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const url    = editing ? `${BASE}/api/management/teachers/${editing.id}` : `${BASE}/api/management/teachers`;
    const method = editing ? 'PATCH' : 'POST';
    const res    = await fetch(url, { method, headers: jsonH(), body: JSON.stringify(form) });
    const data   = await res.json();
    if (res.ok) {
      await fetch(`${BASE}/api/management/teachers/${data.id}/subjects`, {
        method: 'PUT', headers: jsonH(),
        body: JSON.stringify({ subjectIds: selSubjects }),
      });
      toast(editing ? 'Teacher updated' : 'Teacher added');
      setDialog(false);
      fetch_();
    } else {
      toast(data.message || 'Failed', 'error');
    }
    setSaving(false);
  };

  const handleDeactivate = async (id) => {
    const res = await fetch(`${BASE}/api/management/teachers/${id}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { toast('Teacher deactivated'); fetch_(); }
    else toast('Failed', 'error');
  };

  return (
    <>
      <Section
        title="Teachers"
        subtitle="Add teachers and assign the subjects they can teach."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Add Teacher
          </Button>
        }
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: C.brand }} /></Box>
        ) : teachers.length === 0 ? (
          <Typography sx={{ color: C.muted, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            No teachers added yet.
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '6px' }}>
            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  {['#','Name','Emp. No.','Email','Phone','Subjects','Status',''].map(h => (
                    <TableCell key={h} sx={{ ...headCell, ...(h===''?{borderRight:'none'}:{}) }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.map((t, idx) => (
                  <TableRow key={t.id} sx={{ backgroundColor: idx%2===0 ? C.white : C.rowAlt, '&:hover':{ backgroundColor: C.rowHover } }}>
                    <TableCell sx={{ ...bodyCell, color: C.muted, textAlign: 'center', width: 40 }}>{idx+1}</TableCell>
                    <TableCell sx={{ ...bodyCell, fontWeight: 600 }}>{t.firstName} {t.lastName}</TableCell>
                    <TableCell sx={{ ...bodyCell, fontFamily: 'monospace', fontSize: '0.82rem' }}>{t.employeeNumber||'—'}</TableCell>
                    <TableCell sx={{ ...bodyCell, color: '#1565C0' }}>{t.email||'—'}</TableCell>
                    <TableCell sx={bodyCell}>{t.phone||'—'}</TableCell>
                    <TableCell sx={bodyCell}>
                      {(t.subjects||[]).length > 0 ? (
                        <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                          {(t.subjects||[]).slice(0,3).map(s => (
                            <Chip key={s.id} label={s.name} size="small"
                              sx={{ fontSize:'0.65rem', fontWeight:600, height:18, bgcolor:'#EEF2FF', color:'#3730A3' }} />
                          ))}
                          {(t.subjects||[]).length > 3 && (
                            <Chip label={`+${(t.subjects||[]).length-3}`} size="small"
                              sx={{ fontSize:'0.65rem', height:18, bgcolor: C.headerBg, color: C.muted }} />
                          )}
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize:'0.78rem', color: C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>None</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={bodyCell}>
                      <Chip label={t.isActive ? 'Active' : 'Inactive'} size="small"
                        sx={{ fontWeight:700, fontSize:'0.72rem', bgcolor: t.isActive?'#E8F5E9':'#F5F5F5', color: t.isActive?C.accent:C.muted }} />
                    </TableCell>
                    <TableCell sx={{ ...bodyCell, borderRight:'none' }}>
                      <Box sx={{ display:'flex', gap:0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(t)} sx={{ color: C.brand }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {t.isActive && (
                          <Tooltip title="Deactivate">
                            <IconButton size="small" onClick={() => handleDeactivate(t.id)} sx={{ color: C.danger }}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      {/* ── Add / Edit dialog ──────────────────────────────── */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '8px' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {editing ? 'Edit Teacher' : 'Add Teacher'}
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Names */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="First Name *" value={form.firstName} size="small" fullWidth
              error={!!errors.firstName} helperText={errors.firstName||''}
              inputProps={{ maxLength: 50 }}
              onChange={e => { setForm(f=>({...f,firstName:e.target.value})); if(errors.firstName) setErrors(v=>({...v,firstName:''})); }}
            />
            <TextField
              label="Last Name *" value={form.lastName} size="small" fullWidth
              error={!!errors.lastName} helperText={errors.lastName||''}
              inputProps={{ maxLength: 50 }}
              onChange={e => { setForm(f=>({...f,lastName:e.target.value})); if(errors.lastName) setErrors(v=>({...v,lastName:''})); }}
            />
          </Box>

          {/* Emp No + Gender */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Employee Number" value={form.employeeNumber} size="small" fullWidth
              error={!!errors.employeeNumber} helperText={errors.employeeNumber||''}
              inputProps={{ maxLength: 20 }}
              onChange={e => { setForm(f=>({...f,employeeNumber:e.target.value})); if(errors.employeeNumber) setErrors(v=>({...v,employeeNumber:''})); }}
            />
            <TextField select label="Gender" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))} size="small" fullWidth>
              <MenuItem value="">—</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
            </TextField>
          </Box>

          {/* Email */}
          <TextField
            label="Email" value={form.email} size="small" fullWidth
            placeholder="teacher@school.co.za"
            error={!!errors.email} helperText={errors.email||''}
            inputProps={{ maxLength: 100 }}
            onChange={e => { setForm(f=>({...f,email:e.target.value})); if(errors.email) setErrors(v=>({...v,email:''})); }}
          />

          {/* Phone */}
          <TextField
            label="Phone *" value={form.phone} size="small" fullWidth
            placeholder="0821234567"
            error={!!errors.phone}
            helperText={errors.phone || `${(form.phone||'').replace(/\D/g,'').length}/10 digits`}
            inputProps={{ maxLength: 15 }}
            onChange={e => {
              const val = e.target.value.replace(/[^\d\s+\-()]/g,'');
              setForm(f=>({...f,phone:val}));
              if(errors.phone) setErrors(v=>({...v,phone:''}));
            }}
          />

          {/* Subject chips */}
          <Box>
            <Typography sx={{ fontSize:'0.78rem', fontWeight:600, color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mb:1 }}>
              Subjects this teacher can teach
            </Typography>
            {allNatSubjects.length === 0 ? (
              <Typography sx={{ fontSize:'0.78rem', color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                Loading subjects…
              </Typography>
            ) : (
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.75, maxHeight:180, overflowY:'auto', p:1, border:`1px solid ${C.border}`, borderRadius:'6px' }}>
                {allNatSubjects.map(ns => {
                  const selected = selSubjects.includes(ns.id);
                  return (
                    <Chip key={ns.id} label={ns.name} size="small" clickable
                      onClick={() => setSelSubjects(p => selected ? p.filter(x=>x!==ns.id) : [...p,ns.id])}
                      sx={{
                        fontWeight:600, fontSize:'0.72rem', fontFamily:"'IBM Plex Sans', sans-serif",
                        background: selected ? C.brand : C.white,
                        color:      selected ? C.white : C.text,
                        border:     `1px solid ${selected ? C.brand : C.border}`,
                      }}
                    />
                  );
                })}
              </Box>
            )}
            {selSubjects.length > 0 && (
              <Typography sx={{ fontSize:'0.72rem', color: C.accent, mt:0.75, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                {selSubjects.length} subject{selSubjects.length!==1?'s':''} selected
              </Typography>
            )}
          </Box>

        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setDialog(false)} sx={{ textTransform:'none', color: C.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ background: C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Teacher'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))} sx={{ fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TIMETABLE GRID  —  Days on Y-axis · Periods on X-axis
═══════════════════════════════════════════════════════════════ */
const TimetableGrid = ({ classId, onBack }) => {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [slotDialog,  setSlotDialog]  = useState(null);
  const [form,        setForm]        = useState({ subjectId: '', teacherId: '' });
  const [saving,      setSaving]      = useState(false);
  const [clash,       setClash]       = useState('');
  const [snack,       setSnack]       = useState({ open: false, msg: '', sev: 'success' });
  const [teacherBusy, setTeacherBusy] = useState([]);

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/management/timetable/${classId}`, { headers: authH() });
      if (res.ok) setData(await res.json());
    } catch { /* handled below */ }
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const slotMap = {};
  data?.slots?.forEach(s => { slotMap[`${s.dayOfWeek}-${s.periodId}`] = s; });

  const openSlot = (periodId, dayOfWeek) => {
    const existing = slotMap[`${dayOfWeek}-${periodId}`];
    setForm({ subjectId: existing?.subjectId||'', teacherId: existing?.teacherId||'' });
    setClash(''); setTeacherBusy([]);
    setSlotDialog({ periodId, dayOfWeek, existing });
  };

  const handleTeacherChange = async (teacherId) => {
    setForm(f => ({ ...f, teacherId }));
    if (!teacherId) return setTeacherBusy([]);
    try {
      const res = await fetch(`${BASE}/api/management/timetable/teacher-availability?teacherId=${teacherId}`, { headers: authH() });
      if (res.ok) setTeacherBusy(await res.json());
    } catch { /* non-critical */ }
  };

  const isTeacherBusy = (periodId, dayOfWeek) =>
    teacherBusy.some(b => b.periodId === periodId && b.dayOfWeek === dayOfWeek);

  const handleAssign = async () => {
    if (!form.subjectId || !form.teacherId)
      return setClash('Please select both a subject and a teacher.');
    setSaving(true); setClash('');
    try {
      if (slotDialog?.existing)
        await fetch(`${BASE}/api/management/timetable/${slotDialog.existing.id}`, { method:'DELETE', headers: authH() });
      const res = await fetch(`${BASE}/api/management/timetable`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ classId, subjectId: parseInt(form.subjectId), teacherId: parseInt(form.teacherId), periodId: slotDialog.periodId, dayOfWeek: slotDialog.dayOfWeek }),
      });
      const d = await res.json();
      if (res.ok) { toast(`${d.subjectName} assigned`); setSlotDialog(null); fetchData(); }
      else setClash(d.message || 'Failed to assign');
    } catch { setClash('Network error. Check server is running.'); }
    setSaving(false);
  };

  const handleRemoveSlot = async (slot) => {
    try {
      await fetch(`${BASE}/api/management/timetable/${slot.id}`, { method:'DELETE', headers: authH() });
      toast('Slot cleared'); fetchData();
    } catch { toast('Failed to remove slot','error'); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear the entire timetable for this class?')) return;
    try {
      await fetch(`${BASE}/api/management/timetable/class/${classId}/clear`, { method:'DELETE', headers: authH() });
      toast('Timetable cleared'); fetchData();
    } catch { toast('Failed','error'); }
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', py:6 }}><CircularProgress sx={{ color: C.brand }} /></Box>;
  if (!data)   return <Typography sx={{ color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>Failed to load timetable.</Typography>;

  const filledSlots = data.slots.length;
  const totalSlots  = data.periods.filter(p=>!p.isBreak).length * 5;

  return (
    <Box>
      {/* Class header */}
      <Box sx={{ background: C.brand, borderRadius:'8px', p:2.5, mb:3, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography sx={{ fontWeight:800, fontSize:'1.4rem', color: C.white, fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {data.class.name}
            {data.class.stream && <Chip label={data.class.stream} size="small" sx={{ ml:1.5, bgcolor:'rgba(255,255,255,0.2)', color: C.white, fontWeight:700, fontSize:'0.75rem' }} />}
          </Typography>
          <Typography sx={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', mt:0.25, fontFamily:"'IBM Plex Sans', sans-serif" }}>
            Grade {data.class.grade} · {data.class.year} · {filledSlots}/{totalSlots} slots filled
          </Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1 }}>
          <Button size="small" onClick={handleClearAll}
            sx={{ textTransform:'none', color:'rgba(255,255,255,0.7)', fontWeight:600, border:'1px solid rgba(255,255,255,0.3)', fontFamily:"'IBM Plex Sans', sans-serif", '&:hover':{ background:'rgba(255,255,255,0.1)' } }}>
            Clear All
          </Button>
          <Button size="small" onClick={onBack}
            sx={{ textTransform:'none', color: C.white, fontWeight:700, border:'1px solid rgba(255,255,255,0.5)', fontFamily:"'IBM Plex Sans', sans-serif", '&:hover':{ background:'rgba(255,255,255,0.1)' } }}>
            ← Back to Classes
          </Button>
        </Box>
      </Box>

      {/* Warnings */}
      {data.teachers.length === 0 && (
        <Box sx={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'6px', p:2, mb:2.5, display:'flex', gap:1.5 }}>
          <WarningAmberIcon sx={{ color:'#D97706', fontSize:20, flexShrink:0 }} />
          <Typography sx={{ fontSize:'0.82rem', color:'#92400E', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            No teachers added yet. Go to the <strong>Teachers</strong> tab first.
          </Typography>
        </Box>
      )}

      {/* Legend */}
      <Box sx={{ display:'flex', gap:2, mb:2, flexWrap:'wrap' }}>
        {[
          { color: C.filled,  border: C.filledBorder, label:'Assigned' },
          { color: C.white,   border: C.border,       label:'Empty — click to assign' },
          { color:'#F5F5F5',  border: C.border,       label:'Break' },
        ].map(l => (
          <Box key={l.label} sx={{ display:'flex', alignItems:'center', gap:0.75 }}>
            <Box sx={{ width:14, height:14, borderRadius:'3px', bgcolor: l.color, border:`1px solid ${l.border}` }} />
            <Typography sx={{ fontSize:'0.75rem', color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{l.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Grid — Days = rows, Periods = columns */}
      <Box sx={{ overflowX:'auto' }}>
        <Table sx={{ borderCollapse:'collapse' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCell, width:90, minWidth:90 }}>Day</TableCell>
              {data.periods.map((period, i) => (
                <TableCell key={period.id} sx={{ ...headCell, textAlign:'center', minWidth: period.isBreak?70:120, background: period.isBreak?'#EFEFEF':C.headerBg, color: period.isBreak?C.muted:C.brand, ...(i===data.periods.length-1?{borderRight:'none'}:{}) }}>
                  <Typography sx={{ fontWeight:700, fontSize:'0.7rem', fontFamily:"'IBM Plex Sans', sans-serif", letterSpacing:'0.04em', textTransform:'uppercase', color:'inherit' }}>{period.name}</Typography>
                  <Typography sx={{ fontSize:'0.63rem', color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:400, textTransform:'none', letterSpacing:0 }}>{period.timeStart?.slice(0,5)}–{period.timeEnd?.slice(0,5)}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {DAYS.map(day => (
              <TableRow key={day}>
                <TableCell sx={{ ...bodyCell, background: C.headerBg, fontWeight:700, fontSize:'0.85rem', color: C.brand, whiteSpace:'nowrap' }}>
                  {day.slice(0,3)}
                </TableCell>
                {data.periods.map((period, i) => {
                  if (period.isBreak) return (
                    <TableCell key={period.id} sx={{ ...bodyCell, background:'#F5F5F5', textAlign:'center', ...(i===data.periods.length-1?{borderRight:'none'}:{}) }}>
                      <Typography sx={{ fontSize:'0.68rem', color: C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>
                    </TableCell>
                  );
                  const slot = slotMap[`${day}-${period.id}`];
                  return (
                    <TableCell key={period.id} onClick={() => openSlot(period.id, day)} sx={{ ...bodyCell, p:'4px', cursor:'pointer', background: slot?C.filled:C.white, border:`1px solid ${slot?C.filledBorder:C.border}`, '&:hover':{ background: slot?'#D4EDDA':'#EFF6FF' }, minWidth:120, ...(i===data.periods.length-1?{borderRight:'none'}:{}) }}>
                      {slot ? (
                        <Box sx={{ p:'4px 6px', position:'relative' }}>
                          <Typography sx={{ fontWeight:700, fontSize:'0.75rem', color: C.brand, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.3 }}>{slot.subjectName}</Typography>
                          <Typography sx={{ fontSize:'0.68rem', color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{slot.teacherFirstName} {slot.teacherLastName}</Typography>
                          <IconButton size="small" onClick={e=>{ e.stopPropagation(); handleRemoveSlot(slot); }} sx={{ position:'absolute', top:0, right:0, width:16, height:16, p:0, color: C.muted, opacity:0, '.MuiTableCell-root:hover &':{opacity:1}, '&:hover':{color:C.danger} }}>
                            <CloseIcon sx={{ fontSize:11 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:44 }}>
                          <Typography sx={{ fontSize:'0.68rem', color:'#CBD5E1', fontFamily:"'IBM Plex Sans', sans-serif" }}>+ assign</Typography>
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Slot dialog */}
      <Dialog open={!!slotDialog} onClose={() => setSlotDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx:{ borderRadius:'8px' } }}>
        <DialogTitle sx={{ fontWeight:700, color: C.brand, fontFamily:"'IBM Plex Sans', sans-serif", pb:1 }}>
          {slotDialog?.existing ? 'Edit Slot' : 'Assign Slot'}
          {slotDialog && <Typography sx={{ fontSize:'0.8rem', color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mt:0.25 }}>{slotDialog.dayOfWeek} · {data.periods.find(p=>p.id===slotDialog.periodId)?.name}</Typography>}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt:2.5, display:'flex', flexDirection:'column', gap:2 }}>
          {clash && (
            <Box sx={{ background: C.clash, border:`1px solid ${C.clashBorder}`, borderRadius:'6px', p:1.5, display:'flex', gap:1 }}>
              <WarningAmberIcon sx={{ color: C.danger, fontSize:18, flexShrink:0 }} />
              <Typography sx={{ fontSize:'0.82rem', color: C.danger, fontFamily:"'IBM Plex Sans', sans-serif" }}>{clash}</Typography>
            </Box>
          )}

          <TextField select label="Subject" value={form.subjectId}
            onChange={e => setForm(f=>({...f,subjectId:e.target.value}))}
            size="small" fullWidth>
            <MenuItem value="">— Select subject —</MenuItem>
            {data.subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>

          <TextField select label="Teacher" value={form.teacherId}
            onChange={e => handleTeacherChange(e.target.value)}
            size="small" fullWidth>
            <MenuItem value="">— Select teacher —</MenuItem>
            {(() => {
              if (!form.subjectId) return (data?.teachers||[]).map(t => {
                const busy = isTeacherBusy(slotDialog?.periodId, slotDialog?.dayOfWeek);
                return <MenuItem key={t.id} value={t.id} disabled={busy}>{t.firstName} {t.lastName}{t.employeeNumber?` (${t.employeeNumber})`:''}{busy?' — busy':''}</MenuItem>;
              });
              const subject = (data?.subjects||[]).find(s => String(s.id)===String(form.subjectId));
              const nsId = subject?.nationalSubjectId;
              const filtered = nsId ? (data?.teachers||[]).filter(t => t.subjectIds?.includes(nsId)) : (data?.teachers||[]);
              if (filtered.length === 0) return [<MenuItem key="none" disabled value="">No teachers assigned to this subject</MenuItem>];
              return filtered.map(t => {
                const busy = isTeacherBusy(slotDialog?.periodId, slotDialog?.dayOfWeek);
                return <MenuItem key={t.id} value={t.id} disabled={busy}>{t.firstName} {t.lastName}{t.employeeNumber?` (${t.employeeNumber})`:''}{busy?' — busy':''}</MenuItem>;
              });
            })()}
          </TextField>

          {form.teacherId && teacherBusy.length > 0 && (
            <Box sx={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'6px', p:1.5 }}>
              <Typography sx={{ fontSize:'0.75rem', fontWeight:700, color:'#D97706', mb:0.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>Teacher's busy slots:</Typography>
              {teacherBusy.map((b,i) => (
                <Typography key={i} sx={{ fontSize:'0.75rem', color:'#92400E', fontFamily:"'IBM Plex Sans', sans-serif" }}>• {b.dayOfWeek} — {b.subjectName} ({b.className})</Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px:3, py:2, gap:1 }}>
          <Button onClick={() => setSlotDialog(null)} sx={{ textTransform:'none', color: C.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={saving}
            sx={{ background: C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {saving ? 'Saving…' : slotDialog?.existing ? 'Update' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))} sx={{ fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TIMETABLE TAB — class picker
═══════════════════════════════════════════════════════════════ */
const TimetableTab = () => {
  const [classes,       setClasses]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filterGrade,   setFilterGrade]   = useState('');
  const GRADES = [8,9,10,11,12];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/api/setup/classes`, { headers: authH() });
        if (res.ok) setClasses(await res.json());
      } catch { /* handled in UI */ }
      setLoading(false);
    })();
  }, []);

  if (selectedClass) return <TimetableGrid classId={selectedClass.id} onBack={() => setSelectedClass(null)} />;

  const filtered = classes.filter(c => !filterGrade || c.grade === parseInt(filterGrade));

  return (
    <Section title="Timetable Builder" subtitle="Select a class to build or edit its weekly timetable.">
      <Box sx={{ display:'flex', gap:2, mb:3 }}>
        <TextField select label="Filter Grade" value={filterGrade} onChange={e=>setFilterGrade(e.target.value)} size="small" sx={{ width:160 }}>
          <MenuItem value="">All Grades</MenuItem>
          {GRADES.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
        </TextField>
      </Box>
      {loading ? (
        <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress sx={{ color: C.brand }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ p:4, textAlign:'center' }}>
          <SchoolIcon sx={{ color: C.muted, fontSize:40, mb:1 }} />
          <Typography sx={{ color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>No classes found. Create classes in School Setup first.</Typography>
        </Box>
      ) : (
        <Box sx={{ display:'flex', flexWrap:'wrap', gap:2 }}>
          {filtered.map(cls => (
            <Box key={cls.id} onClick={() => setSelectedClass(cls)} sx={{ width:160, p:2.5, borderRadius:'8px', cursor:'pointer', border:`1.5px solid ${C.border}`, background: C.white, textAlign:'center', '&:hover':{ borderColor: C.brand, background:'#EFF6FF' }, transition:'all 0.15s' }}>
              <Typography sx={{ fontWeight:800, fontSize:'1.8rem', color: C.brand, lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{cls.name}</Typography>
              <Typography sx={{ fontSize:'0.75rem', color: C.muted, mt:0.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>Grade {cls.grade}</Typography>
              {cls.stream && <Chip label={cls.stream} size="small" sx={{ mt:1, fontWeight:700, fontSize:'0.7rem', bgcolor:'#EEF2FF', color:'#3730A3' }} />}
            </Box>
          ))}
        </Box>
      )}
    </Section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const TimetablePage = () => {
  const [tab, setTab] = useState('teachers');

  return (
    <Box sx={{ minHeight:'100vh', background:'#F0F4F8', fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <Box sx={{ background: C.brand, px:'32px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
        <Typography sx={{ color: C.white, fontWeight:800, fontSize:'1rem', letterSpacing:'0.04em', fontFamily:"'IBM Plex Sans', sans-serif" }}>📅 TIMETABLE</Typography>
        <Typography sx={{ color:'rgba(255,255,255,0.55)', fontSize:'0.8rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>Admin Portal</Typography>
      </Box>

      <Container maxWidth="lg" sx={{ py:4 }}>
        <Box sx={{ mb:3 }}>
          <Typography sx={{ fontWeight:800, fontSize:'1.6rem', color: C.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.2 }}>Timetable Management</Typography>
          <Typography sx={{ color: C.muted, fontSize:'0.875rem', mt:0.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>Add teachers then build the weekly timetable per class.</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1.5, mb:3 }}>
          <TabBtn active={tab==='teachers'}  onClick={()=>setTab('teachers')}  icon={<PeopleAltIcon sx={{ fontSize:18 }} />}    label="Teachers" />
          <TabBtn active={tab==='timetable'} onClick={()=>setTab('timetable')} icon={<CalendarMonthIcon sx={{ fontSize:18 }} />} label="Timetable Builder" />
        </Box>
        {tab==='teachers'  && <TeachersTab />}
        {tab==='timetable' && <TimetableTab />}
      </Container>
    </Box>
  );
};

export default TimetablePage;



