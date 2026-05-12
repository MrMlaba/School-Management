import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, CircularProgress, Tooltip, Grid, Snackbar, Alert,
  FormGroup, FormControlLabel, Checkbox, Divider,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import PowerIcon        from '@mui/icons-material/Power';
import PowerOffIcon     from '@mui/icons-material/PowerOff';
import CloudUploadIcon  from '@mui/icons-material/CloudUpload';
import ImageIcon        from '@mui/icons-material/Image';
import SystemLayout, { FONT, BLUE } from '../../components/system/SystemLayout';

const API   = 'http://localhost:5005';
const token = () => localStorage.getItem('systemToken');
const hdr   = () => ({ Authorization: `Bearer ${token()}` });
const jsonHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

// All possible grades and streams
const ALL_GRADES  = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const ALL_STREAMS = ['Physics', 'Commerce', 'Humanities'];

const EMPTY_FORM = {
  name: '', location: '', phone: '', email: '', principal: '', imageUrl: '',
  grades:  [...ALL_GRADES],
  streams: [...ALL_STREAMS],
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONT, fontSize: '0.875rem', borderRadius: '7px',
    '& fieldset':             { borderColor: '#e2e8f0' },
    '&:hover fieldset':       { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root':             { fontFamily: FONT, fontSize: '0.875rem', color: '#94a3b8' },
  '& .MuiInputLabel-root.Mui-focused': { color: BLUE },
  '& .MuiInputBase-input':             { fontFamily: FONT, color: '#1e293b' },
};

// ── Image upload box ──────────────────────────────────────────────────────────
const ImageUploader = ({ value, onChange }) => {
  const inputRef              = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');

  useEffect(() => { setPreview(value || ''); }, [value]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch(`${API}/api/system/upload-image`, {
        method:  'POST',
        headers: hdr(),
        body:    fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange(data.url);
        setPreview(`${API}${data.url}`);
      } else {
        alert('Image upload failed: ' + (data.message || 'Unknown error'));
        setPreview(value || '');
      }
    } catch {
      alert('Image upload failed — check backend is running.');
      setPreview(value || '');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const displaySrc = preview
    ? (preview.startsWith('blob:') || preview.startsWith('http') ? preview : `${API}${preview}`)
    : null;

  return (
    <Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.8rem', color: '#475569', mb: 1 }}>
        School Image
      </Typography>

      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          width: '100%', height: 180,
          border: `2px dashed ${displaySrc ? BLUE : '#e2e8f0'}`,
          borderRadius: '10px',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f8fafc',
          position: 'relative',
          transition: 'border-color 0.2s, background 0.2s',
          '&:hover': { borderColor: BLUE, bgcolor: 'rgba(56,189,248,0.04)' },
        }}
      >
        {uploading ? (
          <Stack alignItems="center" spacing={1}>
            <CircularProgress size={28} sx={{ color: BLUE }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: '#94a3b8' }}>
              Uploading…
            </Typography>
          </Stack>
        ) : displaySrc ? (
          <>
            <Box
              component="img"
              src={displaySrc}
              alt="School"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <Box sx={{
              position: 'absolute', inset: 0,
              bgcolor: 'rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
              '&:hover': { opacity: 1 },
            }}>
              <CloudUploadIcon sx={{ color: '#fff', fontSize: 28 }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: '#fff', mt: 0.5 }}>
                Click to change
              </Typography>
            </Box>
          </>
        ) : (
          <Stack alignItems="center" spacing={1}>
            <ImageIcon sx={{ fontSize: 36, color: '#cbd5e1' }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
              Click to upload image
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: '#cbd5e1' }}>
              JPG, PNG or WebP · max 5MB
            </Typography>
          </Stack>
        )}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </Box>
  );
};

// ── Checkbox group ────────────────────────────────────────────────────────────
const CheckboxGroup = ({ label, all, selected, onChange }) => (
  <Box>
    <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.8rem', color: '#475569', mb: 0.75 }}>
      {label}
    </Typography>
    <Box sx={{
      p: 1.5, border: '1px solid #e2e8f0', borderRadius: '8px', bgcolor: '#f8fafc',
    }}>
      <FormGroup row>
        {all.map((item) => (
          <FormControlLabel
            key={item}
            control={
              <Checkbox
                size="small"
                checked={selected.includes(item)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, item]);
                  else onChange(selected.filter(s => s !== item));
                }}
                sx={{
                  color: '#cbd5e1', p: 0.5,
                  '&.Mui-checked': { color: BLUE },
                }}
              />
            }
            label={
              <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#334155' }}>
                {item}
              </Typography>
            }
            sx={{ mr: 2, mb: 0.25 }}
          />
        ))}
      </FormGroup>
    </Box>
  </Box>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const SystemSchoolsPage = () => {
  const [schools, setSchools]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialog] = useState(false);
  const [editSchool, setEdit]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' });

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/system/schools`, { headers: hdr() })
      .then(r => r.json())
      // ✅ FIX: safely extract array regardless of response shape
      .then(data => setSchools(Array.isArray(data) ? data : data.schools || data.data || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const openCreate = () => {
    setEdit(null);
    setForm(EMPTY_FORM);
    setDialog(true);
  };

  const openEdit = (school) => {
    setEdit(school);
    setForm({
      name:      school.name      || '',
      location:  school.location  || '',
      phone:     school.phone     || '',
      email:     school.email     || '',
      principal: school.principal || '',
      imageUrl:  school.image     || '',
      grades:    Array.isArray(school.grades)
        ? school.grades
        : (typeof school.grades === 'string' ? JSON.parse(school.grades || '[]') : [...ALL_GRADES]),
      streams:   Array.isArray(school.streams)
        ? school.streams
        : (typeof school.streams === 'string' ? JSON.parse(school.streams || '[]') : [...ALL_STREAMS]),
    });
    setDialog(true);
  };

  const setField = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name?.trim() || !form.location?.trim()) {
      notify('School name and location are required.', 'error');
      return;
    }
    if (form.grades.length === 0) {
      notify('Select at least one grade.', 'error');
      return;
    }
    setSaving(true);
    const body = {
      name:      form.name.trim(),
      location:  form.location.trim(),
      phone:     form.phone     || null,
      email:     form.email     || null,
      principal: form.principal || null,
      image:     form.imageUrl  || null,
      grades:    form.grades,
      streams:   form.streams,
    };
    try {
      const url    = editSchool
        ? `${API}/api/system/schools/${editSchool.id}`
        : `${API}/api/system/schools`;
      const method = editSchool ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: jsonHdr(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (res.ok) {
        notify(editSchool ? 'School updated successfully.' : 'School created successfully.');
        setDialog(false);
        load();
      } else {
        notify(data.error || 'Save failed.', 'error');
      }
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (school) => {
    try {
      const res = await fetch(`${API}/api/system/schools/${school.id}`, {
        method:  'PATCH',
        headers: jsonHdr(),
        body:    JSON.stringify({ isActive: !school.is_active }),
      });
      if (res.ok) {
        notify(`${school.name} ${school.is_active ? 'deactivated' : 'activated'}.`);
        load();
      }
    } catch { notify('Network error.', 'error'); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SystemLayout title="Schools" subtitle="Manage partner schools add, edit, activate or deactivate">

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{
            fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem',
            textTransform: 'none', px: 2.5, py: 1, borderRadius: '7px',
            bgcolor: BLUE, color: '#000', boxShadow: 'none',
            '&:hover': { bgcolor: '#7dd3fc', boxShadow: 'none' },
          }}>
          Add School
        </Button>
      </Box>

      {/* Table */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: '#fff' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: BLUE }} size={28} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['School', 'Location', 'Grades', 'Applications', 'Admins', 'Status', 'Actions'].map(h => (
                      <TableCell key={h} sx={{
                        fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem',
                        color: '#94a3b8', bgcolor: '#f8fafc',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        borderBottom: '1px solid #e2e8f0', py: 1.5,
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schools.map((s) => {
                    const grades = Array.isArray(s.grades)
                      ? s.grades
                      : (typeof s.grades === 'string' ? JSON.parse(s.grades || '[]') : []);
                    return (
                      <TableRow key={s.id} hover
                        sx={{ '& td': { py: 1.5 }, '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.25}>
                            {s.image ? (
                              <Box
                                component="img"
                                src={s.image.startsWith('/api') ? `${API}${s.image}` : s.image}
                                alt={s.name}
                                sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ImageIcon sx={{ fontSize: 16, color: '#cbd5e1' }} />
                              </Box>
                            )}
                            <Box>
                              <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                                {s.name}
                              </Typography>
                              {s.principal && (
                                <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: '#94a3b8' }}>
                                  {s.principal}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#475569' }}>
                          {s.location}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: '#475569' }}>
                            {grades.length > 0 ? `Gr ${grades.map(g => g.replace('Grade ', '')).join(', ')}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#475569' }}>
                          {s.application_count || 0}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#475569' }}>
                          {s.admin_count || 0}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={s.is_active ? 'success' : 'default'}
                            sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, height: 22 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit school">
                              <IconButton size="small" onClick={() => openEdit(s)}
                                sx={{ color: '#64748b', '&:hover': { color: BLUE, bgcolor: 'rgba(56,189,248,0.08)' } }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={s.is_active ? 'Deactivate' : 'Activate'}>
                              <IconButton size="small" onClick={() => toggleActive(s)}
                                sx={{ color: s.is_active ? '#f87171' : '#22c55e', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                                {s.is_active
                                  ? <PowerOffIcon sx={{ fontSize: 16 }} />
                                  : <PowerIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {schools.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: '#94a3b8' }}>
                          No schools yet. Click "Add School" to create the first one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px', maxHeight: '90vh' },
        }}
      >
        <DialogTitle sx={{
          fontFamily: FONT, fontWeight: 700, fontSize: '1rem',
          pb: 1.5, borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {editSchool ? `Edit School — ${editSchool.name}` : 'Add New School'}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Grid container spacing={3}>

            {/* ── Left column: image ── */}
            <Grid item xs={12} md={4}>
              <ImageUploader
                value={form.imageUrl}
                onChange={(url) => setForm(p => ({ ...p, imageUrl: url }))}
              />
            </Grid>

            {/* ── Right column: fields ── */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    size="small" fullWidth label="School Name *" sx={fieldSx}
                    value={form.name} onChange={setField('name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small" fullWidth label="Location *" sx={fieldSx}
                    value={form.location} onChange={setField('location')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small" fullWidth label="Principal" sx={fieldSx}
                    value={form.principal} onChange={setField('principal')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small" fullWidth label="Phone" sx={fieldSx}
                    value={form.phone} onChange={setField('phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small" fullWidth label="Email" type="email" sx={fieldSx}
                    value={form.email} onChange={setField('email')}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* ── Full width: grades and streams ── */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={7}>
                  <CheckboxGroup
                    label="Available Grades *"
                    all={ALL_GRADES}
                    selected={form.grades}
                    onChange={(v) => setForm(p => ({ ...p, grades: v }))}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <CheckboxGroup
                    label="Subject Streams (Grade 10–12)"
                    all={ALL_STREAMS}
                    selected={form.streams}
                    onChange={(v) => setForm(p => ({ ...p, streams: v }))}
                  />
                </Grid>
              </Grid>
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button
            onClick={() => setDialog(false)}
            disabled={saving}
            sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b', fontWeight: 500 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              fontFamily: FONT, fontWeight: 700, textTransform: 'none',
              px: 3.5, py: 1, borderRadius: '7px',
              bgcolor: BLUE, color: '#000', boxShadow: 'none',
              '&:hover': { bgcolor: '#7dd3fc', boxShadow: 'none' },
            }}>
            {saving
              ? <CircularProgress size={16} sx={{ color: '#000' }} />
              : editSchool ? 'Save Changes' : 'Create School'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.sev}
          sx={{ fontFamily: FONT }}
          onClose={() => setSnack(p => ({ ...p, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemSchoolsPage;