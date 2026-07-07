import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, CircularProgress, Grid, Snackbar, Alert,
  FormGroup, FormControlLabel, Checkbox, Divider,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import LedgerSheet from '../../components/system/LedgerSheet';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ Authorization: `Bearer ${token()}` });
const jsonHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

// All possible grades and streams
const ALL_GRADES  = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const ALL_STREAMS = ['Physics', 'Commerce', 'Humanities'];

const EMPTY_FORM = {
  name: '', location: '', phone: '', email: '', principal: '',
  imageBase64: null, logoBase64: null,
  grades:  [...ALL_GRADES],
  streams: [...ALL_STREAMS],
};

const EMPTY_ADMIN = {
  name: '', username: '', password: '',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

// "Who touched this, latest only" — not a history trail, just the most recent stamp.
const Provenance = ({ createdBy, createdAt, updatedBy, updatedAt }) => (
  <Box sx={{ mt: 0.4 }}>
    {createdBy && (
      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>
        Created by {createdBy}{createdAt ? ` · ${fmt(createdAt)}` : ''}
      </Typography>
    )}
    {updatedBy && (
      <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>
        Modified by {updatedBy}{updatedAt ? ` · ${fmt(updatedAt)}` : ''}
      </Typography>
    )}
  </Box>
);

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

// ── Reusable image uploader (Database storage via base64) ─────────────────────
// Used for BOTH the home-page picture (endpoint="image") and the logo (endpoint="logo").
// Newly selected files are stored as base64 in the parent form and saved on submit.
const ImageUploader = ({
  schoolId,
  imageId,
  currentBase64,
  onImageSelect,
  title = 'School Image',
  endpoint = 'image',
  helper = 'JPG, PNG or WebP · max 5MB',
  objectFit = 'cover',
  height = 180,
}) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (currentBase64) {
      // Newly selected image - show base64 directly
      setPreview(currentBase64);
    } else if (imageId && schoolId) {
      // Existing image - fetch from server with version parameter for cache-busting
      setPreview(`${API}/api/system/schools/${schoolId}/${endpoint}?v=${imageId}`);
    } else {
      // No image
      setPreview(null);
    }
  }, [imageId, schoolId, currentBase64, endpoint]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPreview(evt.target.result);
      onImageSelect?.(evt.target.result); // store base64 in the parent form
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.8rem', color: '#475569', mb: 1 }}>
        {title}
      </Typography>

      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          width: '100%', height,
          border: `2px dashed ${preview ? BLUE : '#e2e8f0'}`,
          borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f8fafc', position: 'relative',
          transition: 'border-color 0.2s, background 0.2s',
          '&:hover': { borderColor: BLUE, bgcolor: 'rgba(56,189,248,0.04)' },
        }}
      >
        {preview ? (
          <>
            <Box
              component="img"
              src={preview}
              alt={title}
              sx={{ width: '100%', height: '100%', objectFit }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <Box sx={{
              position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 },
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                Click to change
              </Typography>
            </Box>
          </>
        ) : (
          <Stack alignItems="center" spacing={0.5}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
              Click to upload
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center', px: 1 }}>
              {helper}
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

// ── Main page component ───────────────────────────────────────────────────────
const SystemSchoolsPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialog] = useState(false);
  const [editSchool, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  
  // Admin management state
  const [admins, setAdmins] = useState([]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedSchoolForAdmin, setSelectedSchoolForAdmin] = useState(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [adminSaving, setAdminSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const loadSchools = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/system/schools`, { headers: hdr() })
      .then(r => r.json())
      .then(data => setSchools(Array.isArray(data) ? data : data.schools || data.data || []))
      .catch(err => {
        console.error(err);
        setSchools([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadAdmins = useCallback((schoolId) => {
    fetch(`${API}/api/system/schools/${schoolId}/admins`, { headers: hdr() })
      .then(r => r.json())
      .then(data => setAdmins(Array.isArray(data) ? data : data.admins || []))
      .catch(() => setAdmins([]));
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  // ── Schools Management ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEdit(null);
    setForm(EMPTY_FORM);
    setTabValue(0);
    setDialog(true);
  };

  const openEdit = (school) => {
    setEdit(school);
    setForm({
      name: school.name || '',
      location: school.location || '',
      phone: school.phone || '',
      email: school.email || '',
      principal: school.principal || '',
      imageBase64: null,
      logoBase64: null,
      grades: Array.isArray(school.grades)
        ? school.grades
        : (typeof school.grades === 'string' ? JSON.parse(school.grades || '[]') : [...ALL_GRADES]),
      streams: Array.isArray(school.streams)
        ? school.streams
        : (typeof school.streams === 'string' ? JSON.parse(school.streams || '[]') : [...ALL_STREAMS]),
    });
    setTabValue(0);
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
      name: form.name.trim(),
      location: form.location.trim(),
      phone: form.phone || null,
      email: form.email || null,
      principal: form.principal || null,
      grades: form.grades,
      streams: form.streams,
      imageBase64: form.imageBase64 || null,
      logoBase64: form.logoBase64 || null,
    };

    try {
      const url = editSchool
        ? `${API}/api/system/schools/${editSchool.id}`
        : `${API}/api/system/schools`;
      const method = editSchool ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: jsonHdr(), body: JSON.stringify(body) });
      const data = await res.json();

      if (res.ok) {
        notify(editSchool ? 'School updated successfully.' : 'School created successfully.');
        setDialog(false);
        loadSchools();
      } else {
        notify(data.error || 'Save failed.', 'error');
      }
    } catch {
      notify('Network error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (school) => {
    try {
      const res = await fetch(`${API}/api/system/schools/${school.id}`, {
        method: 'PATCH',
        headers: jsonHdr(),
        body: JSON.stringify({ isActive: !school.is_active }),
      });
      if (res.ok) {
        notify(`${school.name} ${school.is_active ? 'deactivated' : 'activated'}.`);
        loadSchools();
      }
    } catch {
      notify('Network error.', 'error');
    }
  };

  // ── Admins Management ──────────────────────────────────────────────────────
  const openAddAdmin = (school) => {
    setSelectedSchoolForAdmin(school);
    setAdminForm(EMPTY_ADMIN);
    loadAdmins(school.id);
    setAdminDialogOpen(true);
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.name?.trim() || !adminForm.username?.trim() || !adminForm.password) {
      notify('All admin fields are required.', 'error');
      return;
    }
    if (adminForm.password.length < 8) {
      notify('Password must be at least 8 characters.', 'error');
      return;
    }

    setAdminSaving(true);
    try {
      const res = await fetch(
        `${API}/api/system/schools/${selectedSchoolForAdmin.id}/admins`,
        {
          method: 'POST',
          headers: jsonHdr(),
          body: JSON.stringify({
            name: adminForm.name.trim(),
            username: adminForm.username.trim(),
            password: adminForm.password,
          }),
        }
      );
      const data = await res.json();

      if (res.ok) {
        notify('Admin account created successfully.');
        setAdminForm(EMPTY_ADMIN);
        loadAdmins(selectedSchoolForAdmin.id);
      } else {
        notify(data.error || 'Failed to create admin.', 'error');
      }
    } catch {
      notify('Network error.', 'error');
    } finally {
      setAdminSaving(false);
    }
  };

  const deleteAdmin = async (adminId) => {
    if (!window.confirm('Delete this admin account?')) return;

    try {
      const res = await fetch(
        `${API}/api/system/schools/${selectedSchoolForAdmin.id}/admins/${adminId}`,
        { method: 'DELETE', headers: hdr() }
      );
      if (res.ok) {
        notify('Admin deleted successfully.');
        loadAdmins(selectedSchoolForAdmin.id);
      }
    } catch {
      notify('Network error.', 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SystemLayout title="Schools & Admins" subtitle="Manage partner schools, set administrators, and store images in database">
      <LedgerSheet
        title="Schools"
        meta={
          <Box component="span" onClick={openCreate} sx={{ cursor: 'pointer', color: core.link, fontWeight: 700 }}>
            + Add School
          </Box>
        }
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: BLUE }} size={28} />
          </Box>
        ) : (
          <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '6px' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['School', 'Location', 'Grades', 'Applications', 'Admins', 'Status', 'Actions'].map(h => (
                    <TableCell
                      key={h}
                      sx={{
                        fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem',
                        color: INK_FAINT, bgcolor: '#F8FAFC',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        borderBottom: `1px solid ${BORDER}`, py: 1.5,
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
                    <TableRow
                      key={s.id}
                      hover
                      sx={{ '& td': { py: 1.5 }, '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: INK }}>
                          {s.name}
                        </Typography>
                        {s.principal && (
                          <Typography sx={{ fontFamily: FONT, fontSize: '0.7rem', color: INK_SOFT }}>
                            {s.principal}
                          </Typography>
                        )}
                        <Provenance createdBy={s.created_by} createdAt={s.created_at} updatedBy={s.updated_by} updatedAt={s.updated_at} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_SOFT }}>
                        {s.location}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_SOFT }}>
                          {grades.length > 0 ? `Gr ${grades.map(g => g.replace('Grade ', '')).join(', ')}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_SOFT }}>
                        {s.application_count || 0}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_SOFT }}>
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
                        <Stack direction="row" spacing={1.5}>
                          <Box component="span" onClick={() => openEdit(s)} sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: core.link, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                            Edit
                          </Box>
                          <Box component="span" onClick={() => openAddAdmin(s)} sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: core.link, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                            Admins
                          </Box>
                          <Box component="span" onClick={() => toggleActive(s)} sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: s.is_active ? core.danger : core.accent, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                            {s.is_active ? 'Deactivate' : 'Activate'}
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {schools.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK_FAINT }}>
                        No schools yet. Click "Add School" to create the first one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </LedgerSheet>

      {/* ── Add / Edit School Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px', maxHeight: '90vh' },
        }}>
        <DialogTitle
          sx={{
            fontFamily: FONT, fontWeight: 700, fontSize: '1rem',
            pb: 1.5, borderBottom: '1px solid #f1f5f9',
          }}>
          {editSchool ? `Edit School — ${editSchool.name}` : 'Add New School'}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Grid container spacing={3}>
            {/* Left column: picture + logo */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2.5}>
                <ImageUploader
                  schoolId={editSchool?.id}
                  imageId={editSchool?.image_id}
                  currentBase64={form.imageBase64}
                  onImageSelect={(base64) => setForm(p => ({ ...p, imageBase64: base64 }))}
                  title="School Picture (home page)"
                  endpoint="image"
                  helper="Campus / building photo · JPG, PNG, WebP · max 5MB"
                  objectFit="cover"
                />
                <ImageUploader
                  schoolId={editSchool?.id}
                  imageId={editSchool?.logo_id}
                  currentBase64={form.logoBase64}
                  onImageSelect={(base64) => setForm(p => ({ ...p, logoBase64: base64 }))}
                  title="School Logo (dashboards & reports) — optional"
                  endpoint="logo"
                  helper="PNG with transparent background works best · max 5MB"
                  objectFit="contain"
                  height={140}
                />
              </Stack>
            </Grid>

            {/* Right column: fields */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    size="small"
                    fullWidth
                    label="School Name *"
                    sx={fieldSx}
                    value={form.name}
                    onChange={setField('name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Location *"
                    sx={fieldSx}
                    value={form.location}
                    onChange={setField('location')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Principal"
                    sx={fieldSx}
                    value={form.principal}
                    onChange={setField('principal')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Phone"
                    sx={fieldSx}
                    value={form.phone}
                    onChange={setField('phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Email"
                    type="email"
                    sx={fieldSx}
                    value={form.email}
                    onChange={setField('email')}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Full width: grades and streams */}
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
              bgcolor: BLUE, color: '#fff', boxShadow: 'none',
              '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' },
            }}>
            {saving
              ? <CircularProgress size={16} sx={{ color: '#fff' }} />
              : editSchool ? 'Save Changes' : 'Create School'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Admin Management Dialog ── */}
      <Dialog
        open={adminDialogOpen}
        onClose={() => !adminSaving && setAdminDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px', maxHeight: '90vh' },
        }}>
        <DialogTitle
          sx={{
            fontFamily: FONT, fontWeight: 700, fontSize: '1rem',
            pb: 1.5, borderBottom: '1px solid #f1f5f9',
          }}>
          {selectedSchoolForAdmin?.name} — Manage Admins
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Stack spacing={2.5}>
            {/* Create Admin Form */}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', mb: 1.5 }}>
                Add New Administrator
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  fullWidth
                  label="Full Name"
                  sx={fieldSx}
                  value={adminForm.name}
                  onChange={(e) => setAdminForm(p => ({ ...p, name: e.target.value }))}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Username"
                  sx={fieldSx}
                  value={adminForm.username}
                  onChange={(e) => setAdminForm(p => ({ ...p, username: e.target.value }))}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Password"
                  type="password"
                  sx={fieldSx}
                  value={adminForm.password}
                  onChange={(e) => setAdminForm(p => ({ ...p, password: e.target.value }))}
                  helperText="Minimum 8 characters"
                />
                <Button
                  variant="outlined"
                  onClick={handleCreateAdmin}
                  disabled={adminSaving}
                  sx={{
                    fontFamily: FONT, fontWeight: 600, textTransform: 'none',
                    color: BLUE, borderColor: BLUE,
                    '&:hover': { bgcolor: 'rgba(56,189,248,0.08)' },
                  }}>
                  {adminSaving ? <CircularProgress size={16} /> : 'Add Admin'}
                </Button>
              </Stack>
            </Box>

            {/* Admins List */}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', mb: 1.5 }}>
                Current Administrators
              </Typography>
              {admins.length === 0 ? (
                <Typography sx={{ fontFamily: FONT, fontSize: '0.8rem', color: '#94a3b8' }}>
                  No admins yet.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {admins.map((admin) => (
                    <Box
                      key={admin.id}
                      sx={{
                        p: 1.5, border: '1px solid #e2e8f0', borderRadius: '8px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                      <Box>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>
                          {admin.name}
                        </Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: '#94a3b8' }}>
                          @{admin.username}
                        </Typography>
                        <Provenance createdBy={admin.created_by} createdAt={admin.created_at} updatedBy={admin.updated_by} updatedAt={admin.updated_at} />
                      </Box>
                      <Box
                        component="span"
                        onClick={() => deleteAdmin(admin.id)}
                        sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: core.danger, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                        Remove
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
          <Button
            onClick={() => setAdminDialogOpen(false)}
            sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b', fontWeight: 500 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity={snack.sev}
          sx={{ fontFamily: FONT }}
          onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemSchoolsPage;