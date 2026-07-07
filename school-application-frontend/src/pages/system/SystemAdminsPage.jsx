import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableHead,
  TableRow, TableCell, TableBody, Chip,
  TextField, Stack, CircularProgress, MenuItem, Select, FormControl,
  Snackbar, Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import MasterDetailShell from '../../components/system/MasterDetailShell';
import RecordField from '../../components/system/RecordField';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONT, fontSize: '0.85rem', borderRadius: '7px',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

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

const EMPTY_CREATE = { name: '', username: '', password: '', schoolId: '' };

const SystemAdminsPage = () => {
  const [admins, setAdmins]   = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [isNew, setIsNew]       = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/system/admins`,  { headers: hdr() }).then(r => r.json()),
      fetch(`${API}/api/system/schools`, { headers: hdr() }).then(r => r.json()),
    ])
      .then(([a, s]) => {
        setAdmins(Array.isArray(a) ? a : a.admins || a.data || []);
        setSchools(Array.isArray(s) ? s : s.schools || s.data || []);
      })
      .catch(() => { setAdmins([]); setSchools([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const selectAdmin = (a) => { setSelected(a); setIsNew(false); };
  const startNew    = () => { setSelected(null); setIsNew(true); setCreateForm(EMPTY_CREATE); };

  const handleCreate = async () => {
    const { name, username, password, schoolId } = createForm;
    if (!name || !username || !password || !schoolId) { notify('All fields are required.', 'error'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/system/admins`, { method: 'POST', headers: hdr(), body: JSON.stringify(createForm) });
      const data = await res.json();
      if (res.ok) { notify('Admin account created.'); setIsNew(false); load(); }
      else notify(data.error || 'Failed to create admin.', 'error');
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) { notify('Minimum 6 characters.', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/system/admins/${selected.id}/reset-password`, { method: 'PATCH', headers: hdr(), body: JSON.stringify({ newPassword }) });
      const data = await res.json();
      if (res.ok) { notify(`Password reset for ${selected.username}.`); setResetOpen(false); setNewPassword(''); load(); }
      else notify(data.error || 'Reset failed.', 'error');
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch(`${API}/api/system/admins/${selected.id}/toggle-active`, { method: 'PATCH', headers: hdr() });
      if (res.ok) { notify(`${selected.username} ${selected.is_active ? 'suspended' : 'reactivated'}.`); load(); setSelected(a => ({ ...a, is_active: !a.is_active })); }
    } catch { notify('Network error.', 'error'); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/system/admins/${selected.id}`, { method: 'DELETE', headers: hdr() });
      if (res.ok) { notify(`${selected.username} deleted.`); setConfirmDelete(false); setSelected(null); load(); }
    } catch { notify('Network error.', 'error'); }
  };

  const filtered = admins.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.username?.toLowerCase().includes(search.toLowerCase()) || a.school?.toLowerCase().includes(search.toLowerCase()));

  return (
    <SystemLayout title="School Admins" subtitle="Create and manage school administrator accounts">
      <MasterDetailShell
        breadcrumb={['Admins', selected ? selected.name : isNew ? 'New Admin' : null].filter(Boolean)}
        onAdd={startNew} addLabel="+ Create Admin"
        onRefresh={load}
        search={search} onSearchChange={setSearch}
        list={
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: BLUE }} size={26} /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Name', 'School', 'Status'].map(h => (
                    <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.id} hover onClick={() => selectAdmin(a)}
                    sx={{ cursor: 'pointer', bgcolor: selected?.id === a.id ? core.brand + '0F' : 'transparent', '& td': { py: 1.1 } }}>
                    <TableCell>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: INK }}>{a.name}</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: INK_FAINT }}>@{a.username}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_SOFT }}>{a.school}</TableCell>
                    <TableCell>
                      <Chip label={a.is_active ? 'Active' : 'Suspended'} size="small" color={a.is_active ? 'success' : 'error'} sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, height: 20 }} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT }}>No admins found.</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )
        }
        detail={
          isNew ? (
            <>
              <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2}>
                  <RecordField label="Full Name"><TextField size="small" fullWidth sx={fieldSx} value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} /></RecordField>
                  <RecordField label="Username"><TextField size="small" fullWidth sx={fieldSx} value={createForm.username} onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))} /></RecordField>
                  <RecordField label="Password"><TextField size="small" fullWidth type="password" sx={fieldSx} value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} helperText="Minimum 8 characters, admin changes it on first login" /></RecordField>
                  <RecordField label="School">
                    <FormControl size="small" fullWidth sx={fieldSx}>
                      <Select displayEmpty value={createForm.schoolId} onChange={e => setCreateForm(p => ({ ...p, schoolId: e.target.value }))}>
                        <MenuItem value=""><em>Select a school…</em></MenuItem>
                        {schools.filter(s => s.is_active).map(s => <MenuItem key={s.id} value={s.id} sx={{ fontFamily: FONT, fontSize: '0.85rem' }}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </RecordField>
                </Stack>
              </Box>
              <Box sx={{ borderTop: `1px solid ${BORDER}`, p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
                <Button onClick={() => setIsNew(false)} sx={{ fontFamily: FONT, textTransform: 'none', color: INK_SOFT }}>Cancel</Button>
                <Button variant="contained" onClick={handleCreate} disabled={saving}
                  sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
                  {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
                </Button>
              </Box>
            </>
          ) : !selected ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT, textAlign: 'center' }}>
                Select an admin from the list, or "+ Create Admin" to add one.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2}>
                  <RecordField label="Name"><Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK, pt: '9px' }}>{selected.name}</Typography></RecordField>
                  <RecordField label="Username"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: INK, pt: '9px' }}>{selected.username}</Typography></RecordField>
                  <RecordField label="School"><Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK, pt: '9px' }}>{selected.school}</Typography></RecordField>
                  <RecordField label="Last Login">
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK_SOFT, pt: '9px' }}>
                      {selected.last_login ? new Date(selected.last_login).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </Typography>
                  </RecordField>
                  <RecordField label="Status">
                    <Chip label={selected.is_active ? 'Active' : 'Suspended'} size="small" color={selected.is_active ? 'success' : 'error'} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem' }} />
                    {selected.temp_password_flag && <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: core.warn, mt: 0.5 }}>Temp password — not yet changed</Typography>}
                  </RecordField>
                  <Divider />
                  <Provenance createdBy={selected.created_by} createdAt={selected.created_at} updatedBy={selected.updated_by} updatedAt={selected.updated_at} />
                </Stack>
              </Box>
              <Box sx={{ borderTop: `1px solid ${BORDER}`, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Stack direction="row" spacing={2}>
                  <Box component="span" onClick={handleToggle} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: selected.is_active ? core.warn : core.accent, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                    {selected.is_active ? 'Suspend' : 'Reactivate'}
                  </Box>
                  <Box component="span" onClick={() => setConfirmDelete(true)} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: core.danger, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                    Delete
                  </Box>
                </Stack>
                <Button variant="outlined" onClick={() => { setResetOpen(true); setNewPassword(''); }}
                  sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', borderRadius: '7px', color: BLUE, borderColor: BLUE, '&:hover': { bgcolor: core.brand + '0C' } }}>
                  Reset Password
                </Button>
              </Box>
            </>
          )
        }
      />

      {/* ── Reset password dialog ── */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Reset Password — {selected?.username}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <TextField size="small" fullWidth label="New Temporary Password" type="password" sx={fieldSx} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setResetOpen(false)} sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={handleReset} disabled={saving}
            sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm delete dialog ── */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1 }}>Delete Admin Account</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.875rem', color: '#475569' }}>
            Permanently delete <strong>{selected?.name}</strong> ({selected?.username})? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(false)} sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', boxShadow: 'none' }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} sx={{ fontFamily: FONT }} onClose={() => setSnack(p => ({ ...p, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemAdminsPage;
