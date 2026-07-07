import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableHead,
  TableRow, TableCell, TableBody, Chip,
  TextField, Stack, CircularProgress, Snackbar, Alert,
  FormGroup, FormControlLabel, Checkbox, Divider,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import MasterDetailShell from '../../components/system/MasterDetailShell';
import RecordField from '../../components/system/RecordField';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ Authorization: `Bearer ${token()}` });
const jsonHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const ALL_GRADES  = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const ALL_STREAMS = ['Physics', 'Commerce', 'Humanities'];

const EMPTY_FORM = {
  name: '', location: '', phone: '', email: '', principal: '',
  imageBase64: null, logoBase64: null,
  grades:  [...ALL_GRADES],
  streams: [...ALL_STREAMS],
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
    fontFamily: FONT, fontSize: '0.85rem', borderRadius: '7px',
    '& fieldset':             { borderColor: '#e2e8f0' },
    '&:hover fieldset':       { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
};

// ── Reusable image uploader (Database storage via base64) ─────────────────────
const ImageUploader = ({
  schoolId, imageId, currentBase64, onImageSelect,
  title = 'School Image', endpoint = 'image',
  helper = 'JPG, PNG or WebP · max 5MB', objectFit = 'cover', height = 140,
}) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (currentBase64) setPreview(currentBase64);
    else if (imageId && schoolId) setPreview(`${API}/api/system/schools/${schoolId}/${endpoint}?v=${imageId}`);
    else setPreview(null);
  }, [imageId, schoolId, currentBase64, endpoint]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (evt) => { setPreview(evt.target.result); onImageSelect?.(evt.target.result); e.target.value = ''; };
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.75rem', color: INK_SOFT, mb: 0.75 }}>{title}</Typography>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          width: '100%', height,
          border: `2px dashed ${preview ? BLUE : '#e2e8f0'}`,
          borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#fff', position: 'relative',
          '&:hover': { borderColor: BLUE },
        }}
      >
        {preview ? (
          <>
            <Box component="img" src={preview} alt={title} sx={{ width: '100%', height: '100%', objectFit }} onError={(e) => { e.target.style.display = 'none'; }} />
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', '&:hover': { opacity: 1 } }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Click to change</Typography>
            </Box>
          </>
        ) : (
          <Stack alignItems="center" spacing={0.3}>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>Click to upload</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: '#cbd5e1', textAlign: 'center', px: 1 }}>{helper}</Typography>
          </Stack>
        )}
      </Box>
      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
    </Box>
  );
};

const CheckboxGroup = ({ label, all, selected, onChange }) => (
  <Box>
    <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.75rem', color: INK_SOFT, mb: 0.5 }}>{label}</Typography>
    <Box sx={{ p: 1, border: '1px solid #e2e8f0', borderRadius: '6px', bgcolor: '#fff' }}>
      <FormGroup row>
        {all.map((item) => (
          <FormControlLabel
            key={item}
            control={
              <Checkbox size="small" checked={selected.includes(item)}
                onChange={(e) => onChange(e.target.checked ? [...selected, item] : selected.filter(s => s !== item))}
                sx={{ color: '#cbd5e1', p: 0.5, '&.Mui-checked': { color: BLUE } }} />
            }
            label={<Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_SOFT }}>{item}</Typography>}
            sx={{ mr: 1.5, mb: 0.1 }}
          />
        ))}
      </FormGroup>
    </Box>
  </Box>
);

const SystemSchoolsPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);   // the school shown in the detail panel
  const [isNew, setIsNew]       = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [admins, setAdmins]     = useState([]);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' });

  const loadSchools = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/system/schools`, { headers: hdr() })
      .then(r => r.json())
      .then(data => setSchools(Array.isArray(data) ? data : data.schools || data.data || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const populateForm = (school) => setForm({
    name: school.name || '', location: school.location || '', phone: school.phone || '',
    email: school.email || '', principal: school.principal || '',
    imageBase64: null, logoBase64: null,
    grades: Array.isArray(school.grades) ? school.grades : (typeof school.grades === 'string' ? JSON.parse(school.grades || '[]') : [...ALL_GRADES]),
    streams: Array.isArray(school.streams) ? school.streams : (typeof school.streams === 'string' ? JSON.parse(school.streams || '[]') : [...ALL_STREAMS]),
  });

  const selectSchool = (school) => {
    setSelected(school); setIsNew(false); populateForm(school);
    fetch(`${API}/api/system/schools/${school.id}/admins`, { headers: hdr() })
      .then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d : [])).catch(() => setAdmins([]));
  };

  const startNew = () => { setSelected(null); setIsNew(true); setForm(EMPTY_FORM); setAdmins([]); };
  const discard  = () => { if (isNew) startNew(); else if (selected) populateForm(selected); };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.location?.trim()) { notify('School name and location are required.', 'error'); return; }
    if (form.grades.length === 0) { notify('Select at least one grade.', 'error'); return; }
    setSaving(true);
    const body = {
      name: form.name.trim(), location: form.location.trim(),
      phone: form.phone || null, email: form.email || null, principal: form.principal || null,
      grades: form.grades, streams: form.streams,
      imageBase64: form.imageBase64 || null, logoBase64: form.logoBase64 || null,
    };
    try {
      const url = selected ? `${API}/api/system/schools/${selected.id}` : `${API}/api/system/schools`;
      const method = selected ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: jsonHdr(), body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        notify(selected ? 'School updated.' : 'School created.');
        loadSchools();
        if (!selected) startNew();
        else setSelected(data.school);
      } else {
        notify(data.error || 'Save failed.', 'error');
      }
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/api/system/schools/${selected.id}`, {
        method: 'PATCH', headers: jsonHdr(), body: JSON.stringify({ isActive: !selected.is_active }),
      });
      if (res.ok) { notify(`${selected.name} ${selected.is_active ? 'deactivated' : 'activated'}.`); loadSchools(); setSelected(s => ({ ...s, is_active: !s.is_active })); }
    } catch { notify('Network error.', 'error'); }
  };

  const filtered = schools.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.location?.toLowerCase().includes(search.toLowerCase()));

  return (
    <SystemLayout title="Schools" subtitle="Manage partner schools, images, and admin assignment">
      <MasterDetailShell
        breadcrumb={['Schools', selected ? selected.name : isNew ? 'New School' : null].filter(Boolean)}
        onAdd={startNew} addLabel="+ Add School"
        onRefresh={loadSchools}
        search={search} onSearchChange={setSearch}
        list={
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: BLUE }} size={26} /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['School', 'Location', 'Status'].map(h => (
                    <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id} hover selected={selected?.id === s.id} onClick={() => selectSchool(s)}
                    sx={{ cursor: 'pointer', bgcolor: selected?.id === s.id ? core.brand + '0F' : 'transparent', '& td': { py: 1.1 } }}>
                    <TableCell sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: INK }}>{s.name}</TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_SOFT }}>{s.location}</TableCell>
                    <TableCell>
                      <Chip label={s.is_active ? 'Active' : 'Inactive'} size="small" color={s.is_active ? 'success' : 'default'} sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, height: 20 }} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT }}>No schools found.</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )
        }
        detail={
          !selected && !isNew ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT, textAlign: 'center' }}>
                Select a school from the list, or "+ Add School" to create one.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <ImageUploader schoolId={selected?.id} imageId={selected?.image_id} currentBase64={form.imageBase64}
                        onImageSelect={(b) => setForm(p => ({ ...p, imageBase64: b }))} title="Picture" endpoint="image" objectFit="cover" />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <ImageUploader schoolId={selected?.id} imageId={selected?.logo_id} currentBase64={form.logoBase64}
                        onImageSelect={(b) => setForm(p => ({ ...p, logoBase64: b }))} title="Logo" endpoint="logo" objectFit="contain" />
                    </Box>
                  </Box>

                  <RecordField label="Name"><TextField size="small" fullWidth sx={fieldSx} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></RecordField>
                  <RecordField label="Location"><TextField size="small" fullWidth sx={fieldSx} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></RecordField>
                  <RecordField label="Principal"><TextField size="small" fullWidth sx={fieldSx} value={form.principal} onChange={e => setForm(p => ({ ...p, principal: e.target.value }))} /></RecordField>
                  <RecordField label="Phone"><TextField size="small" fullWidth sx={fieldSx} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></RecordField>
                  <RecordField label="Email"><TextField size="small" fullWidth sx={fieldSx} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></RecordField>

                  <Divider />
                  <RecordField label="Grades"><CheckboxGroup label="" all={ALL_GRADES} selected={form.grades} onChange={v => setForm(p => ({ ...p, grades: v }))} /></RecordField>
                  <RecordField label="Streams"><CheckboxGroup label="" all={ALL_STREAMS} selected={form.streams} onChange={v => setForm(p => ({ ...p, streams: v }))} /></RecordField>

                  {selected && (
                    <>
                      <Divider />
                      <RecordField label="Status">
                        <Chip label={selected.is_active ? 'Active' : 'Inactive'} size="small" color={selected.is_active ? 'success' : 'default'} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem' }} />
                      </RecordField>
                      <RecordField label="Admins">
                        {admins.length === 0 ? (
                          <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>None assigned yet.</Typography>
                        ) : (
                          <Stack spacing={0.5}>
                            {admins.map(a => (
                              <Typography key={a.id} sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_SOFT }}>{a.name} <Box component="span" sx={{ color: INK_FAINT }}>(@{a.username})</Box></Typography>
                            ))}
                          </Stack>
                        )}
                        <Box component="a" href="/system/admins" sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: core.link, display: 'inline-block', mt: 0.5 }}>Manage in Admins →</Box>
                      </RecordField>
                      <Provenance createdBy={selected.created_by} createdAt={selected.created_at} updatedBy={selected.updated_by} updatedAt={selected.updated_at} />
                    </>
                  )}
                </Stack>
              </Box>

              <Box sx={{ borderTop: `1px solid ${BORDER}`, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                {selected ? (
                  <Box component="span" onClick={toggleActive} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: selected.is_active ? core.danger : core.accent, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                    {selected.is_active ? 'Deactivate' : 'Activate'}
                  </Box>
                ) : <Box />}
                <Stack direction="row" spacing={1}>
                  <Button onClick={discard} sx={{ fontFamily: FONT, textTransform: 'none', color: INK_SOFT }}>Reset</Button>
                  <Button variant="contained" onClick={handleSave} disabled={saving}
                    sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
                    {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
                  </Button>
                </Stack>
              </Box>
            </>
          )
        }
      />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} sx={{ fontFamily: FONT }} onClose={() => setSnack(p => ({ ...p, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemSchoolsPage;
