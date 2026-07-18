import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  CircularProgress, Snackbar, Alert, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Divider,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon  from '@mui/icons-material/Close';
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
  const [panelMode,   setPanelMode]   = useState(null); // null | 'view' | 'add' | 'edit'
  const [selected,    setSelected]    = useState(null);
  const [form,        setForm]        = useState(EF);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [allNatSubs,  setAllNatSubs]  = useState([]);
  const [selSubjects, setSelSubjects] = useState([]);
  const [snack,       setSnack]       = useState({ open: false, msg: '', sev: 'success' });

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const BASE  = `${API_BASE}/api/system/schools/${schoolId}`;

  useEffect(() => {
    if (!schoolId) return;
    fetch(`${BASE}/setup/national-subjects`, { headers: authH() })
      .then(r => r.ok ? r.json() : []).then(setAllNatSubs).catch(() => {});
  }, [schoolId, BASE]);

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const res = await fetch(`${BASE}/teachers`, { headers: authH() });
    if (res.ok) {
      const data = await res.json();
      setTeachers(data);
      // keep selected in sync
      if (selected) {
        const updated = data.find(t => t.id === selected.id);
        if (updated) setSelected(updated);
      }
    }
    setLoading(false);
  }, [schoolId, BASE]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const openAdd = () => {
    setForm(EF); setSelSubjects([]); setErrors({});
    setSelected(null); setPanelMode('add');
  };

  const openView = t => {
    setSelected(t);
    setForm({ firstName: t.firstName, lastName: t.lastName, email: t.email || '', phone: t.phone || '', employeeNumber: t.employeeNumber || '', gender: t.gender || '' });
    setSelSubjects((t.subjects || []).map(s => s.id));
    setErrors({});
    setPanelMode('view');
  };

  const startEdit = () => setPanelMode('edit');

  const validate = () => {
    const e = {};
    if (!form.firstName?.trim() || form.firstName.trim().length < 2) e.firstName = 'Required (min 2 chars)';
    if (!form.lastName?.trim()  || form.lastName.trim().length < 2)  e.lastName  = 'Required (min 2 chars)';
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    if (!form.phone?.trim()) e.phone = 'Phone is required';
    else if (form.phone.replace(/\D/g, '').length !== 10) e.phone = 'Must be 10 digits';
    if (form.employeeNumber?.trim() && !/^[A-Za-z0-9]{2,20}$/.test(form.employeeNumber.trim()))
      e.employeeNumber = '2–20 letters/digits only';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const isEdit = panelMode === 'edit';
    const url = isEdit ? `${BASE}/teachers/${selected.id}` : `${BASE}/teachers`;
    const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: jsonH(), body: JSON.stringify(form) });
    const d = await res.json();
    if (res.ok) {
      await fetch(`${BASE}/teachers/${d.id}/subjects`, {
        method: 'PUT', headers: jsonH(), body: JSON.stringify({ subjectIds: selSubjects }),
      });
      toast(isEdit ? 'Teacher updated' : 'Teacher added');
      await fetchTeachers();
      if (!isEdit) {
        const fresh = (await (await fetch(`${BASE}/teachers`, { headers: authH() })).json());
        const added = fresh.find(t => t.id === d.id);
        if (added) { setSelected(added); setPanelMode('view'); }
      } else {
        setPanelMode('view');
      }
    } else toast(d.message || 'Failed', 'error');
    setSaving(false);
  };

  const handleDeactivate = async id => {
    const res = await fetch(`${BASE}/teachers/${id}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { toast('Teacher deactivated'); fetchTeachers(); setPanelMode(null); setSelected(null); }
    else toast('Failed to deactivate', 'error');
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (!schoolId) {
    return (
      <SystemLayout title="Teachers">
        <Box sx={{ p: 4, color: INK_SOFT, fontFamily: FONT }}>Select a school first.</Box>
      </SystemLayout>
    );
  }

  return (
    <SystemLayout title="Teachers" subtitle={schoolName}>
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: list ── */}
        <Box sx={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: INK }}>
              Teachers
              <Typography component="span" sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_SOFT, ml: 1 }}>
                {teachers.length} total
              </Typography>
            </Typography>
            <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 15 }} />} onClick={openAdd}
              sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none', fontSize: '0.75rem', py: 0.6 }}>
              Add Teacher
            </Button>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {loading
              ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: TEAL }} /></Box>
              : (
                <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', bgcolor: CARD }}>
                  <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                    <TableHead>
                      <TableRow>
                        {['#', 'Name', 'Emp #', 'Subjects', 'Status', 'Login'].map(h => (
                          <TableCell key={h} sx={{ ...hc, ...(h === 'Login' ? { borderRight: 'none' } : {}) }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teachers.length === 0
                        ? <TableRow><TableCell colSpan={6} sx={{ ...bc, textAlign: 'center', color: INK_FAINT }}>No teachers added yet.</TableCell></TableRow>
                        : teachers.map((t, idx) => (
                          <TableRow key={t.id} onClick={() => openView(t)}
                            sx={{
                              cursor: 'pointer',
                              boxShadow: selected?.id === t.id ? `inset 3px 0 0 0 ${TEAL}` : 'none',
                              bgcolor: selected?.id === t.id ? `${TEAL}12` : idx % 2 === 0 ? CARD : '#0F2137',
                              '&:hover': { bgcolor: `${TEAL}0A` },
                            }}>
                            <TableCell sx={{ ...bc, color: INK_FAINT, textAlign: 'center', width: 36 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ ...bc, fontWeight: 600 }}>{t.firstName} {t.lastName}</TableCell>
                            <TableCell sx={{ ...bc, fontFamily: 'monospace', fontSize: '0.7rem' }}>{t.employeeNumber || '—'}</TableCell>
                            <TableCell sx={bc}>
                              {(t.subjects || []).length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                                  {(t.subjects || []).slice(0, 2).map(s => (
                                    <Chip key={s.id} label={s.name} size="small" sx={{ fontSize: '0.57rem', fontWeight: 600, height: 16, bgcolor: `${TEAL}18`, color: TEAL }} />
                                  ))}
                                  {(t.subjects || []).length > 2 && (
                                    <Chip label={`+${(t.subjects || []).length - 2}`} size="small" sx={{ fontSize: '0.57rem', height: 16, bgcolor: BORDER, color: INK_SOFT }} />
                                  )}
                                </Box>
                              ) : (
                                <Typography sx={{ fontSize: '0.68rem', color: INK_FAINT, fontStyle: 'italic', fontFamily: FONT }}>None</Typography>
                              )}
                            </TableCell>
                            <TableCell sx={bc}>
                              <Chip label={t.isActive ? 'Active' : 'Inactive'} size="small"
                                sx={{ fontWeight: 700, fontSize: '0.61rem', bgcolor: t.isActive ? '#10B98120' : '#EF444420', color: t.isActive ? '#10B981' : '#EF4444' }} />
                            </TableCell>
                            <TableCell sx={{ ...bc, borderRight: 'none' }}>
                              <Chip label={t.username ? 'Set' : 'Not set'} size="small"
                                sx={{ fontWeight: 700, fontSize: '0.61rem', bgcolor: t.username ? `${TEAL}18` : '#EF444420', color: t.username ? TEAL : '#EF4444' }} />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
          </Box>
        </Box>

        {/* ── Right: detail / edit panel ── */}
        <Box sx={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#0A1628' }}>
          {!panelMode ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: INK_FAINT, fontFamily: FONT, fontSize: '0.8rem' }}>Select a teacher or click Add Teacher</Typography>
            </Box>
          ) : (
            <>
              {/* panel header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: INK }}>
                  {panelMode === 'add' ? 'Add New Teacher' : panelMode === 'edit' ? `Edit — ${selected?.firstName} ${selected?.lastName}` : `${selected?.firstName} ${selected?.lastName}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {panelMode === 'view' && (
                    <>
                      <Button size="small" onClick={startEdit}
                        sx={{ color: TEAL, textTransform: 'none', fontWeight: 700, fontFamily: FONT, fontSize: '0.72rem', border: `1px solid ${TEAL}`, px: 1.5 }}>
                        Edit
                      </Button>
                      {selected?.isActive && (
                        <Button size="small" onClick={() => handleDeactivate(selected.id)}
                          sx={{ color: '#EF4444', textTransform: 'none', fontWeight: 700, fontFamily: FONT, fontSize: '0.72rem', border: '1px solid #EF4444', px: 1.5 }}>
                          Deactivate
                        </Button>
                      )}
                    </>
                  )}
                  <Tooltip title="Close panel">
                    <IconButton size="small" onClick={() => { setPanelMode(null); setSelected(null); }} sx={{ color: INK_SOFT }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                {/* VIEW mode */}
                {panelMode === 'view' && selected && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, pb: 2, borderBottom: `1px solid ${BORDER}` }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: FONT }}>
                          {selected.firstName?.[0]}{selected.lastName?.[0]}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: INK, fontFamily: FONT }}>{selected.firstName} {selected.lastName}</Typography>
                        <Typography sx={{ fontSize: '0.69rem', color: INK_SOFT, fontFamily: FONT }}>
                          {selected.employeeNumber ? `Emp# ${selected.employeeNumber}` : 'No employee number'} · {selected.gender || '—'}
                        </Typography>
                      </Box>
                    </Box>
                    {[
                      { label: 'Email',   value: selected.email || '—' },
                      { label: 'Phone',   value: selected.phone || '—' },
                      { label: 'Status',  value: <Chip label={selected.isActive ? 'Active' : 'Inactive'} size="small" sx={{ fontWeight: 700, fontSize: '0.62rem', bgcolor: selected.isActive ? '#10B98120' : '#EF444420', color: selected.isActive ? '#10B981' : '#EF4444' }} /> },
                      { label: 'Login',   value: <Chip label={selected.username || 'Not set'} size="small" sx={{ fontWeight: 700, fontSize: '0.62rem', bgcolor: selected.username ? `${TEAL}18` : '#EF444420', color: selected.username ? TEAL : '#EF4444' }} /> },
                      { label: 'Added',   value: fmtDate(selected.createdAt) },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.9, borderBottom: `1px solid ${BORDER}` }}>
                        <Typography sx={{ fontSize: '0.69rem', color: INK_SOFT, fontFamily: FONT }}>{label}</Typography>
                        {typeof value === 'string'
                          ? <Typography sx={{ fontSize: '0.73rem', color: INK, fontWeight: 500, fontFamily: FONT }}>{value}</Typography>
                          : value}
                      </Box>
                    ))}
                    <Box sx={{ mt: 2 }}>
                      <Typography sx={{ fontSize: '0.66rem', color: INK_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75, fontFamily: FONT }}>Subjects</Typography>
                      {(selected.subjects || []).length === 0
                        ? <Typography sx={{ fontSize: '0.73rem', color: INK_FAINT, fontStyle: 'italic', fontFamily: FONT }}>No subjects assigned</Typography>
                        : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {(selected.subjects || []).map(s => (
                              <Chip key={s.id} label={s.name} size="small" sx={{ fontSize: '0.63rem', fontWeight: 600, height: 20, bgcolor: `${TEAL}18`, color: TEAL }} />
                            ))}
                          </Box>}
                    </Box>
                  </Box>
                )}

                {/* ADD / EDIT mode */}
                {(panelMode === 'add' || panelMode === 'edit') && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField fullWidth size="small" label="First Name *" value={form.firstName}
                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                        error={!!errors.firstName} helperText={errors.firstName}
                        InputProps={{ sx: { fontFamily: FONT, color: INK } }} InputLabelProps={{ sx: { fontFamily: FONT, color: INK_SOFT } }} />
                      <TextField fullWidth size="small" label="Last Name *" value={form.lastName}
                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                        error={!!errors.lastName} helperText={errors.lastName}
                        InputProps={{ sx: { fontFamily: FONT, color: INK } }} InputLabelProps={{ sx: { fontFamily: FONT, color: INK_SOFT } }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField fullWidth size="small" label="Email" value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        error={!!errors.email} helperText={errors.email}
                        InputProps={{ sx: { fontFamily: FONT, color: INK } }} InputLabelProps={{ sx: { fontFamily: FONT, color: INK_SOFT } }} />
                      <TextField fullWidth size="small" label="Phone *" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        error={!!errors.phone} helperText={errors.phone}
                        InputProps={{ sx: { fontFamily: FONT, color: INK } }} InputLabelProps={{ sx: { fontFamily: FONT, color: INK_SOFT } }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField fullWidth size="small" label="Employee Number" value={form.employeeNumber}
                        onChange={e => setForm(f => ({ ...f, employeeNumber: e.target.value }))}
                        error={!!errors.employeeNumber} helperText={errors.employeeNumber || '2–20 letters/digits'}
                        InputProps={{ sx: { fontFamily: FONT, color: INK } }} InputLabelProps={{ sx: { fontFamily: FONT, color: INK_SOFT } }} />
                      <TextField select fullWidth size="small" label="Gender" value={form.gender}
                        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                        InputProps={{ sx: { fontFamily: FONT, color: INK } }} InputLabelProps={{ sx: { fontFamily: FONT, color: INK_SOFT } }}>
                        <MenuItem value="">— Select —</MenuItem>
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </TextField>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.72rem', color: INK_SOFT, mb: 0.75 }}>Assign subjects (click to toggle):</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 140, overflowY: 'auto', p: 1, border: `1px solid ${BORDER}`, borderRadius: '6px' }}>
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
                      {selSubjects.length > 0 && (
                        <Typography sx={{ fontSize: '0.63rem', color: TEAL, mt: 0.75, fontFamily: FONT }}>
                          {selSubjects.length} subject{selSubjects.length !== 1 ? 's' : ''} selected
                        </Typography>
                      )}
                    </Box>
                    <Divider sx={{ borderColor: BORDER }} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" onClick={handleSave} disabled={saving}
                        sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
                        {saving ? 'Saving…' : panelMode === 'edit' ? 'Update Teacher' : 'Add Teacher'}
                      </Button>
                      <Button onClick={() => { setPanelMode(selected ? 'view' : null); setErrors({}); }}
                        sx={{ color: INK_SOFT, textTransform: 'none', fontFamily: FONT }}>
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: FONT }}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
}
