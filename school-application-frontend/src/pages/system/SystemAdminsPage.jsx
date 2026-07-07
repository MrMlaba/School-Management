import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, CircularProgress, MenuItem, Select, FormControl,
  InputLabel, Snackbar, Alert,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import LedgerSheet from '../../components/system/LedgerSheet';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONT, fontSize: '0.875rem', borderRadius: '7px',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT, fontSize: '0.875rem', color: '#94a3b8' },
  '& .MuiInputLabel-root.Mui-focused': { color: BLUE },
  '& .MuiFormHelperText-root': { fontFamily: FONT, fontSize: '0.72rem', ml: 0 },
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

const TextAction = ({ onClick, color, children }) => (
  <Box component="span" onClick={onClick} sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
    {children}
  </Box>
);

const SystemAdminsPage = () => {
  const [admins, setAdmins]         = useState([]);
  const [schools, setSchools]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen]   = useState(false);
  const [selectedAdmin, setSelected] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', username: '', password: '', schoolId: '' });
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [snack, setSnack]           = useState({ open: false, msg: '', sev: 'success' });
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const handleCreate = async () => {
    const { name, username, password, schoolId } = createForm;
    if (!name || !username || !password || !schoolId) {
      notify('All fields are required.', 'error'); return;
    }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/system/admins`, {
        method: 'POST', headers: hdr(),
        body: JSON.stringify({ name, username, password, schoolId }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('Admin account created.');
        setCreateOpen(false);
        setCreateForm({ name: '', username: '', password: '', schoolId: '' });
        load();
      } else {
        notify(data.error || 'Failed to create admin.', 'error');
      }
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      notify('Minimum 6 characters.', 'error'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/system/admins/${selectedAdmin.id}/reset-password`, {
        method: 'PATCH', headers: hdr(),
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Password reset for ${selectedAdmin.username}.`);
        setResetOpen(false);
        setNewPassword('');
        load();
      } else {
        notify(data.error || 'Reset failed.', 'error');
      }
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (admin) => {
    try {
      const res = await fetch(`${API}/api/system/admins/${admin.id}/toggle-active`, {
        method: 'PATCH', headers: hdr(),
      });
      if (res.ok) {
        notify(`${admin.username} ${admin.is_active ? 'suspended' : 'reactivated'}.`);
        load();
      }
    } catch { notify('Network error.', 'error'); }
  };

  const handleDelete = async (admin) => {
    try {
      const res = await fetch(`${API}/api/system/admins/${admin.id}`, {
        method: 'DELETE', headers: hdr(),
      });
      if (res.ok) {
        notify(`${admin.username} deleted.`);
        setConfirmDelete(null);
        load();
      }
    } catch { notify('Network error.', 'error'); }
  };

  return (
    <SystemLayout title="School Admins" subtitle="Create and manage school administrator accounts">
      <LedgerSheet
        title="Admins"
        meta={
          <Box component="span" onClick={() => setCreateOpen(true)} sx={{ cursor: 'pointer', color: core.link, fontWeight: 700 }}>
            + Create Admin
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
                  {['Name', 'Username', 'School', 'Last Login', 'Status', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.id} hover sx={{ '& td': { py: 1.5 }, '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: INK }}>
                        {a.name}
                      </Typography>
                      {a.temp_password_flag && (
                        <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: core.warn }}>
                          Temp password
                        </Typography>
                      )}
                      <Provenance createdBy={a.created_by} createdAt={a.created_at} updatedBy={a.updated_by} updatedAt={a.updated_at} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: INK_SOFT }}>
                      {a.username}
                    </TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_SOFT }}>{a.school}</TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>
                      {a.last_login
                        ? new Date(a.last_login).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.is_active ? 'Active' : 'Suspended'}
                        size="small"
                        color={a.is_active ? 'success' : 'error'}
                        sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5}>
                        <TextAction color={core.link} onClick={() => { setSelected(a); setResetOpen(true); setNewPassword(''); }}>
                          Reset
                        </TextAction>
                        <TextAction color={a.is_active ? core.warn : core.accent} onClick={() => handleToggle(a)}>
                          {a.is_active ? 'Suspend' : 'Reactivate'}
                        </TextAction>
                        <TextAction color={core.danger} onClick={() => setConfirmDelete(a)}>
                          Delete
                        </TextAction>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK_FAINT }}>No admins found.</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </LedgerSheet>

      {/* ── Create admin dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Create School Admin
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={1.75}>
            <TextField size="small" fullWidth label="Full Name *" sx={fieldSx}
              value={createForm.name}
              onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} />
            <TextField size="small" fullWidth label="Username *" sx={fieldSx}
              value={createForm.username}
              onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))}
              helperText="They will use this to log in" />
            <TextField size="small" fullWidth label="Temporary Password *" sx={fieldSx}
              type={showPass ? 'text' : 'password'}
              value={createForm.password}
              onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
              helperText="Admin must change this on first login"
            />
            <Box onClick={() => setShowPass(p => !p)} sx={{ fontFamily: FONT, fontSize: '0.72rem', color: core.link, fontWeight: 600, cursor: 'pointer', mt: -1 }}>
              {showPass ? 'Hide password' : 'Show password'}
            </Box>
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Assign to School *</InputLabel>
              <Select value={createForm.schoolId} label="Assign to School *"
                onChange={e => setCreateForm(p => ({ ...p, schoolId: e.target.value }))}>
                {schools.filter(s => s.is_active).map(s => (
                  <MenuItem key={s.id} value={s.id}
                    sx={{ fontFamily: FONT, fontSize: '0.875rem' }}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)}
            sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reset password dialog ── */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Reset Password — {selectedAdmin?.username}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#64748b', mb: 2 }}>
            Set a new temporary password. The admin will be prompted to change it on next login.
          </Typography>
          <TextField size="small" fullWidth label="New Temporary Password *" sx={fieldSx}
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <Box onClick={() => setShowNew(p => !p)} sx={{ fontFamily: FONT, fontSize: '0.72rem', color: core.link, fontWeight: 600, cursor: 'pointer', mt: 0.75 }}>
            {showNew ? 'Hide password' : 'Show password'}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setResetOpen(false)}
            sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={handleReset} disabled={saving}
            sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm delete dialog ── */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1 }}>
          Delete Admin Account
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.875rem', color: '#475569' }}>
            Are you sure you want to permanently delete <strong>{confirmDelete?.name}</strong> ({confirmDelete?.username})?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)}
            sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(confirmDelete)}
            sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', boxShadow: 'none' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} sx={{ fontFamily: FONT }} onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemAdminsPage;
