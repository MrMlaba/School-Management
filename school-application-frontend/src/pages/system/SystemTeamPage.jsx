import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableHead,
  TableRow, TableCell, TableBody, Chip,
  TextField, Stack, CircularProgress, Snackbar, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import MasterDetailShell from '../../components/system/MasterDetailShell';
import RecordField from '../../components/system/RecordField';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
const myUsername = () => sessionStorage.getItem('systemUsername');

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: FONT, fontSize: '0.85rem', borderRadius: '7px',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: BLUE, borderWidth: '1.5px' },
  },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const EMPTY_CREATE = { name: '', username: '', password: '' };

const SystemTeamPage = () => {
  const [team, setTeam]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [isNew, setIsNew]       = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/system/team`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setTeam(Array.isArray(d) ? d : []))
      .catch(() => setTeam([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const selectMember = (m) => { setSelected(m); setIsNew(false); };
  const startNew = () => { setSelected(null); setIsNew(true); setCreateForm(EMPTY_CREATE); };

  const handleCreate = async () => {
    const { name, username, password } = createForm;
    if (!name || !username || !password) { notify('All fields are required.', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/system/team`, { method: 'POST', headers: hdr(), body: JSON.stringify(createForm) });
      const data = await res.json();
      if (res.ok) { notify('Team member added.'); setIsNew(false); load(); }
      else notify(data.error || 'Failed to add team member.', 'error');
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`${API}/api/system/team/${selected.id}/reset-password`, { method: 'PATCH', headers: hdr() });
      const data = await res.json();
      if (res.ok) setResetResult(data);
      else notify(data.error || 'Reset failed.', 'error');
    } catch { notify('Network error.', 'error'); }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch(`${API}/api/system/team/${selected.id}/toggle-active`, { method: 'PATCH', headers: hdr() });
      const data = await res.json();
      if (res.ok) { notify(`${selected.username} ${data.isActive ? 'reactivated' : 'suspended'}.`); load(); setSelected(m => ({ ...m, is_active: data.isActive })); }
      else notify(data.error || 'Failed.', 'error');
    } catch { notify('Network error.', 'error'); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/system/team/${selected.id}`, { method: 'DELETE', headers: hdr() });
      const data = await res.json();
      if (res.ok) { notify(`${selected.username} removed.`); setConfirmDelete(false); setSelected(null); load(); }
      else notify(data.error || 'Failed.', 'error');
    } catch { notify('Network error.', 'error'); }
  };

  const filtered = team.filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.username?.toLowerCase().includes(search.toLowerCase()));
  const isMe = selected && selected.username === myUsername();

  return (
    <SystemLayout title="IT Team" subtitle="Everyone with system-admin access to this console">
      <MasterDetailShell
        breadcrumb={['IT Team', selected ? selected.name : isNew ? 'New Team Member' : null].filter(Boolean)}
        onAdd={startNew} addLabel="+ Add Team Member"
        onRefresh={load}
        search={search} onSearchChange={setSearch}
        list={
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: BLUE }} size={26} /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Name', 'Username', 'Status'].map(h => (
                    <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id} hover onClick={() => selectMember(m)}
                    sx={{ cursor: 'pointer', bgcolor: selected?.id === m.id ? core.brand + '0F' : 'transparent', '& td': { py: 1.1 } }}>
                    <TableCell sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: INK }}>
                      {m.name}{m.username === myUsername() && <Box component="span" sx={{ color: INK_FAINT, fontWeight: 500 }}> (you)</Box>}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: INK_SOFT }}>{m.username}</TableCell>
                    <TableCell>
                      <Chip label={m.is_active ? 'Active' : 'Suspended'} size="small" color={m.is_active ? 'success' : 'error'} sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, height: 20 }} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT }}>No team members found.</Typography>
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
                  <RecordField label="Username"><TextField size="small" fullWidth sx={fieldSx} value={createForm.username} onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))} helperText="Used to log in to this console" /></RecordField>
                  <RecordField label="Password"><TextField size="small" fullWidth type="password" sx={fieldSx} value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} helperText="Minimum 8 characters" /></RecordField>
                </Stack>
              </Box>
              <Box sx={{ borderTop: `1px solid ${BORDER}`, p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
                <Button onClick={() => setIsNew(false)} sx={{ fontFamily: FONT, textTransform: 'none', color: INK_SOFT }}>Cancel</Button>
                <Button variant="contained" onClick={handleCreate} disabled={saving}
                  sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
                  {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Add'}
                </Button>
              </Box>
            </>
          ) : !selected ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: INK_FAINT, textAlign: 'center' }}>
                Select a team member from the list, or "+ Add Team Member".
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={2}>
                  <RecordField label="Name"><Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK, pt: '9px' }}>{selected.name}</Typography></RecordField>
                  <RecordField label="Username"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: INK, pt: '9px' }}>{selected.username}</Typography></RecordField>
                  <RecordField label="Last Login">
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK_SOFT, pt: '9px' }}>
                      {selected.last_login ? new Date(selected.last_login).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </Typography>
                  </RecordField>
                  <RecordField label="Status">
                    <Chip label={selected.is_active ? 'Active' : 'Suspended'} size="small" color={selected.is_active ? 'success' : 'error'} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem' }} />
                  </RecordField>
                  <Divider />
                  {selected.created_by && (
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT }}>
                      Added by {selected.created_by}{selected.created_at ? ` · ${fmt(selected.created_at)}` : ''}
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Box sx={{ borderTop: `1px solid ${BORDER}`, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Stack direction="row" spacing={2}>
                  {!isMe && (
                    <>
                      <Box component="span" onClick={handleToggle} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: selected.is_active ? core.warn : core.accent, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                        {selected.is_active ? 'Suspend' : 'Reactivate'}
                      </Box>
                      <Box component="span" onClick={() => setConfirmDelete(true)} sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, color: core.danger, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                        Remove
                      </Box>
                    </>
                  )}
                </Stack>
                <Button variant="outlined" onClick={handleReset}
                  sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', borderRadius: '7px', color: BLUE, borderColor: BLUE, '&:hover': { bgcolor: core.brand + '0C' } }}>
                  Reset Password
                </Button>
              </Box>
            </>
          )
        }
      />

      {/* ── Reset password result (shown once) ── */}
      <Dialog open={!!resetResult} onClose={() => setResetResult(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Password Reset — {resetResult?.username}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', color: '#64748b', mb: 2 }}>
            Share this with them directly — it will not be shown again.
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: '6px' }}>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: INK }}>{resetResult?.tempPassword}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setResetResult(null)} sx={{ fontFamily: FONT, textTransform: 'none', fontWeight: 700, color: core.link }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm remove dialog ── */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1 }}>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.875rem', color: '#475569' }}>
            Permanently remove <strong>{selected?.name}</strong> ({selected?.username})? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(false)} sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', boxShadow: 'none' }}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} sx={{ fontFamily: FONT }} onClose={() => setSnack(p => ({ ...p, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemTeamPage;
