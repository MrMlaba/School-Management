import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import LedgerSheet from '../../components/system/LedgerSheet';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
const myUsername = () => sessionStorage.getItem('systemUsername');

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

const TextAction = ({ onClick, color, children }) => (
  <Box component="span" onClick={onClick} sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
    {children}
  </Box>
);

const SystemTeamPage = () => {
  const [team, setTeam]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', username: '', password: '' });
  const [saving, setSaving]         = useState(false);
  const [snack, setSnack]           = useState({ open: false, msg: '', sev: 'success' });
  const [confirmDelete, setConfirmDelete] = useState(null);
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

  const handleCreate = async () => {
    const { name, username, password } = createForm;
    if (!name || !username || !password) { notify('All fields are required.', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/system/team`, { method: 'POST', headers: hdr(), body: JSON.stringify(createForm) });
      const data = await res.json();
      if (res.ok) {
        notify('Team member added.');
        setCreateOpen(false);
        setCreateForm({ name: '', username: '', password: '' });
        load();
      } else {
        notify(data.error || 'Failed to add team member.', 'error');
      }
    } catch { notify('Network error.', 'error'); }
    finally { setSaving(false); }
  };

  const handleReset = async (member) => {
    try {
      const res = await fetch(`${API}/api/system/team/${member.id}/reset-password`, { method: 'PATCH', headers: hdr() });
      const data = await res.json();
      if (res.ok) setResetResult(data);
      else notify(data.error || 'Reset failed.', 'error');
    } catch { notify('Network error.', 'error'); }
  };

  const handleToggle = async (member) => {
    try {
      const res = await fetch(`${API}/api/system/team/${member.id}/toggle-active`, { method: 'PATCH', headers: hdr() });
      const data = await res.json();
      if (res.ok) { notify(`${member.username} ${data.isActive ? 'reactivated' : 'suspended'}.`); load(); }
      else notify(data.error || 'Failed.', 'error');
    } catch { notify('Network error.', 'error'); }
  };

  const handleDelete = async (member) => {
    try {
      const res = await fetch(`${API}/api/system/team/${member.id}`, { method: 'DELETE', headers: hdr() });
      const data = await res.json();
      if (res.ok) { notify(`${member.username} removed.`); setConfirmDelete(null); load(); }
      else notify(data.error || 'Failed.', 'error');
    } catch { notify('Network error.', 'error'); }
  };

  return (
    <SystemLayout title="IT Team" subtitle="Everyone with system-admin access to this console">
      <LedgerSheet
        title="Team Members"
        meta={
          <Box component="span" onClick={() => setCreateOpen(true)} sx={{ cursor: 'pointer', color: core.link, fontWeight: 700 }}>
            + Add Team Member
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
                  {['Name', 'Username', 'Last Login', 'Status', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {team.map((m) => {
                  const isMe = m.username === myUsername();
                  return (
                    <TableRow key={m.id} hover sx={{ '& td': { py: 1.5 }, '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: INK }}>
                          {m.name}{isMe && <Box component="span" sx={{ color: INK_FAINT, fontWeight: 500 }}> (you)</Box>}
                        </Typography>
                        {m.created_by && (
                          <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK_FAINT, mt: 0.4 }}>
                            Added by {m.created_by}{m.created_at ? ` · ${fmt(m.created_at)}` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: INK_SOFT }}>
                        {m.username}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>
                        {m.last_login ? new Date(m.last_login).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.is_active ? 'Active' : 'Suspended'}
                          size="small"
                          color={m.is_active ? 'success' : 'error'}
                          sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5}>
                          <TextAction color={core.link} onClick={() => handleReset(m)}>Reset</TextAction>
                          {!isMe && (
                            <>
                              <TextAction color={m.is_active ? core.warn : core.accent} onClick={() => handleToggle(m)}>
                                {m.is_active ? 'Suspend' : 'Reactivate'}
                              </TextAction>
                              <TextAction color={core.danger} onClick={() => setConfirmDelete(m)}>Remove</TextAction>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {team.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK_FAINT }}>No team members found.</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </LedgerSheet>

      {/* ── Add team member dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Add IT Team Member
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={1.75}>
            <TextField size="small" fullWidth label="Full Name *" sx={fieldSx}
              value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} />
            <TextField size="small" fullWidth label="Username *" sx={fieldSx}
              value={createForm.username} onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))}
              helperText="They will use this to log in to this console" />
            <TextField size="small" fullWidth label="Password *" type="password" sx={fieldSx}
              value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
              helperText="Minimum 8 characters" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', bgcolor: BLUE, color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: core.brandDark, boxShadow: 'none' } }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

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
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: INK }}>
              {resetResult?.tempPassword}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setResetResult(null)} sx={{ fontFamily: FONT, textTransform: 'none', fontWeight: 700, color: core.link }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm remove dialog ── */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', pb: 1 }}>
          Remove Team Member
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: '0.875rem', color: '#475569' }}>
            Are you sure you want to permanently remove <strong>{confirmDelete?.name}</strong> ({confirmDelete?.username})?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ fontFamily: FONT, textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(confirmDelete)}
            sx={{ fontFamily: FONT, fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '7px', boxShadow: 'none' }}>
            Remove
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

export default SystemTeamPage;
