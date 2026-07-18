import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  CircularProgress, Snackbar, Alert, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SystemLayout, {
  FONT, TEAL, BORDER, CARD, INK, INK_SOFT, INK_FAINT,
} from '../../components/system/SystemLayout';
import API_BASE from '../../config';

const token = () => sessionStorage.getItem('systemToken');
const authH = () => ({ Authorization: `Bearer ${token()}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

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

const EF = { firstName: '', lastName: '', email: '', phone: '', employeeNumber: '', gender: '' };

export default function SystemSchoolTeachers() {
  const schoolId   = sessionStorage.getItem('selectedSchoolId');
  const schoolName = sessionStorage.getItem('selectedSchoolName');

  const [teachers,    setTeachers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [dialog,      setDialog]      = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EF);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [allNatSubs,  setAllNatSubs]  = useState([]);
  const [selSubjects, setSelSubjects] = useState([]);
  const [snack,       setSnack]       = useState({ open: false, msg: '', sev: 'success' });

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const BASE  = `${API_BASE}/api/system/schools/${schoolId}`;

  // Load national subjects once
  useEffect(() => {
    if (!schoolId) return;
    fetch(`${BASE}/setup/national-subjects`, { headers: authH() })
      .then(r => r.ok ? r.json() : []).then(setAllNatSubs).catch(() => {});
  }, [schoolId, BASE]);

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const res = await fetch(`${BASE}/teachers`, { headers: authH() });
    if (res.ok) setTeachers(await res.json());
    setLoading(false);
  }, [schoolId, BASE]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  // Default-open the first teacher on load
  const didDefault = useRef(false);
  useEffect(() => {
    if (!didDefault.current && teachers.length > 0) {
      didDefault.current = true;
      openEdit(teachers[0]);
    }
  }, [teachers]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const e = {};
    if (!form.firstName?.trim() || form.firstName.trim().length < 2) e.firstName = 'First name required (min 2 chars)';
    if (!form.lastName?.trim()  || form.lastName.trim().length < 2)  e.lastName  = 'Last name required (min 2 chars)';
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    if (!form.phone?.trim()) e.phone = 'Phone is required';
    else if (form.phone.replace(/\D/g, '').length !== 10) e.phone = 'Phone must be 10 digits';
    if (form.employeeNumber?.trim() && !/^[A-Za-z0-9]{2,20}$/.test(form.employeeNumber.trim()))
      e.employeeNumber = '2–20 letters/digits only';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => { setEditing(null); setForm(EF); setSelSubjects([]); setErrors({}); setDialog(true); };
  const openEdit = t => {
    setEditing(t);
    setForm({ firstName: t.firstName, lastName: t.lastName, email: t.email || '', phone: t.phone || '', employeeNumber: t.employeeNumber || '', gender: t.gender || '' });
    setSelSubjects((t.subjects || []).map(s => s.id));
    setErrors({});
    setDialog(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const url = editing ? `${BASE}/teachers/${editing.id}` : `${BASE}/teachers`;
    const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: jsonH(), body: JSON.stringify(form) });
    const d = await res.json();
    if (res.ok) {
      await fetch(`${BASE}/teachers/${d.id}/subjects`, {
        method: 'PUT', headers: jsonH(), body: JSON.stringify({ subjectIds: selSubjects }),
      });
      toast(editing ? 'Teacher updated' : 'Teacher added');
      setDialog(false);
      fetchTeachers();
    } else toast(d.message || 'Failed', 'error');
    setSaving(false);
  };

  const handleDeactivate = async id => {
    const res = await fetch(`${BASE}/teachers/${id}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { toast('Teacher deactivated'); fetchTeachers(); }
    else toast('Failed to deactivate', 'error');
  };

  if (!schoolId) {
    return (
      <SystemLayout title="Teachers">
        <Box sx={{ p: 4, color: INK_SOFT, fontFamily: FONT }}>Select a school first.</Box>
      </SystemLayout>
    );
  }

  return (
    <SystemLayout title="Teachers" subtitle={schoolName}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: INK }}>
            Teachers
            <Typography component="span" sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, ml: 1 }}>
              {teachers.length} total
            </Typography>
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
            Add Teacher
          </Button>
        </Box>

        {loading
          ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: TEAL }} /></Box>
          : (
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', bgcolor: CARD }}>
              <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    {['#', 'Name', 'Emp #', 'Email', 'Phone', 'Subjects', 'Status', 'Login', ''].map(h => (
                      <TableCell key={h} sx={{ ...hc, ...(h === '' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teachers.length === 0
                    ? <TableRow><TableCell colSpan={9} sx={{ ...bc, textAlign: 'center', color: INK_FAINT }}>No teachers added yet.</TableCell></TableRow>
                    : teachers.map((t, idx) => (
                      <TableRow key={t.id}
                        onClick={() => openEdit(t)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: editing?.id === t.id && dialog ? `${TEAL}12` : idx % 2 === 0 ? CARD : '#0F2137',
                          '&:hover': { bgcolor: `${TEAL}0A` },
                          boxShadow: editing?.id === t.id && dialog ? `inset 3px 0 0 0 ${TEAL}` : 'none',
                        }}>
                        <TableCell sx={{ ...bc, color: INK_FAINT, textAlign: 'center', width: 36 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ ...bc, fontWeight: 600 }}>{t.firstName} {t.lastName}</TableCell>
                        <TableCell sx={{ ...bc, fontFamily: 'monospace', fontSize: '0.7rem' }}>{t.employeeNumber || '—'}</TableCell>
                        <TableCell sx={{ ...bc, color: INK_SOFT }}>{t.email || '—'}</TableCell>
                        <TableCell sx={bc}>{t.phone || '—'}</TableCell>
                        <TableCell sx={bc}>
                          {(t.subjects || []).length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(t.subjects || []).slice(0, 3).map(s => (
                                <Chip key={s.id} label={s.name} size="small" sx={{ fontSize: '0.58rem', fontWeight: 600, height: 18, bgcolor: `${TEAL}18`, color: TEAL }} />
                              ))}
                              {(t.subjects || []).length > 3 && (
                                <Chip label={`+${(t.subjects || []).length - 3}`} size="small" sx={{ fontSize: '0.58rem', height: 18, bgcolor: BORDER, color: INK_SOFT }} />
                              )}
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: '0.69rem', color: INK_FAINT, fontStyle: 'italic', fontFamily: FONT }}>None</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={bc}>
                          <Chip label={t.isActive ? 'Active' : 'Inactive'} size="small"
                            sx={{ fontWeight: 700, fontSize: '0.62rem', bgcolor: t.isActive ? '#10B98120' : '#EF444420', color: t.isActive ? '#10B981' : '#EF4444' }} />
                        </TableCell>
                        <TableCell sx={bc}>
                          <Chip label={t.username ? 'Set' : 'Not set'} size="small"
                            sx={{ fontWeight: 700, fontSize: '0.62rem', bgcolor: t.username ? `${TEAL}18` : '#EF444420', color: t.username ? TEAL : '#EF4444' }} />
                        </TableCell>
                        <TableCell sx={{ ...bc, borderRight: 'none' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={e => { e.stopPropagation(); openEdit(t); }} sx={{ color: TEAL }}>
                                <EditIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            {t.isActive && (
                              <Tooltip title="Deactivate">
                                <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeactivate(t.id); }} sx={{ color: '#EF4444' }}>
                                  <DeleteIcon sx={{ fontSize: 15 }} />
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
      </Box>

      {/* ── Add/Edit dialog ── */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORDER}` } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: INK, fontSize: '0.95rem', borderBottom: `1px solid ${BORDER}` }}>
          {editing ? `Edit — ${editing.firstName} ${editing.lastName}` : 'Add New Teacher'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="First Name *" value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                error={!!errors.firstName} helperText={errors.firstName} />
              <TextField fullWidth size="small" label="Last Name *" value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                error={!!errors.lastName} helperText={errors.lastName} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="Email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                error={!!errors.email} helperText={errors.email} />
              <TextField fullWidth size="small" label="Phone *" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                error={!!errors.phone} helperText={errors.phone} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="Employee Number" value={form.employeeNumber}
                onChange={e => setForm(f => ({ ...f, employeeNumber: e.target.value }))}
                error={!!errors.employeeNumber} helperText={errors.employeeNumber || 'Letters & digits only, 2–20 chars'} />
              <TextField select fullWidth size="small" label="Gender" value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <MenuItem value="">— Select —</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Box>

            {/* Subject assignment */}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mb: 0.75 }}>
                Assign subjects (click to toggle):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 160, overflowY: 'auto' }}>
                {allNatSubs.map(ns => (
                  <Chip key={ns.id} label={ns.name}
                    onClick={() => setSelSubjects(s => s.includes(ns.id) ? s.filter(x => x !== ns.id) : [...s, ns.id])}
                    variant={selSubjects.includes(ns.id) ? 'filled' : 'outlined'}
                    sx={{
                      fontSize: '0.68rem', fontFamily: FONT, cursor: 'pointer', height: 24,
                      bgcolor: selSubjects.includes(ns.id) ? TEAL : 'transparent',
                      color: selSubjects.includes(ns.id) ? '#fff' : INK_SOFT,
                      borderColor: selSubjects.includes(ns.id) ? TEAL : BORDER,
                    }} />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}` }}>
          <Button onClick={() => setDialog(false)} sx={{ color: INK_SOFT, textTransform: 'none', fontFamily: FONT }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
            {saving ? 'Saving…' : editing ? 'Update Teacher' : 'Add Teacher'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: FONT }}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
}
