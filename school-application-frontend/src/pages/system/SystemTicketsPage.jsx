import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, CircularProgress, Snackbar, Alert, Button, Divider,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import SystemLayout, { FONT, BLUE, BORDER, INK, INK_SOFT, INK_FAINT } from '../../components/system/SystemLayout';
import LedgerSheet from '../../components/system/LedgerSheet';
import { core } from '../../theme/tokens';
import API_BASE from '../../config';

const API   = API_BASE;
const token = () => sessionStorage.getItem('systemToken');
const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const STATUS_FILTERS = [
  { value: '',            label: 'All' },
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
];

const statusColor = (status) => ({
  open:        { color: core.link,  bg: '#E3EEFB' },
  in_progress: { color: core.warn,  bg: core.warnBg },
  resolved:    { color: core.accent, bg: core.accentBg },
  closed:      { color: INK_SOFT,   bg: '#F3F4F6' },
}[status] || { color: INK_SOFT, bg: '#F3F4F6' });

const priorityColor = (priority) => ({
  low:    { color: INK_SOFT,   bg: '#F3F4F6' },
  normal: { color: core.link,  bg: '#E3EEFB' },
  high:   { color: core.warn,  bg: core.warnBg },
  urgent: { color: core.danger, bg: core.dangerBg },
}[priority] || { color: INK_SOFT, bg: '#F3F4F6' });

const StatusChip = ({ value }) => {
  const c = statusColor(value);
  return <Chip label={value.replace('_', ' ')} size="small" sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem', textTransform: 'capitalize', color: c.color, bgcolor: c.bg }} />;
};
const PriorityChip = ({ value }) => {
  const c = priorityColor(value);
  return <Chip label={value} size="small" sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.68rem', textTransform: 'capitalize', color: c.color, bgcolor: c.bg }} />;
};

const fmt = (d) => new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

const SystemTicketsPage = () => {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [selected, setSelected] = useState(null);   // ticket detail, once loaded
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' });

  const notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const load = useCallback(() => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : '';
    fetch(`${API}/api/system/support-tickets${qs}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setTickets(Array.isArray(d) ? d : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openTicket = async (id) => {
    setDetailLoading(true);
    setSelected({ id });
    try {
      const res = await fetch(`${API}/api/system/support-tickets/${id}`, { headers: hdr() });
      const data = await res.json();
      if (res.ok) setSelected(data);
      else { notify(data.message || 'Failed to load ticket', 'error'); setSelected(null); }
    } catch {
      notify('Network error', 'error');
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/system/support-tickets/${selected.id}/reply`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ message: reply.trim() }),
      });
      if (res.ok) {
        setReply('');
        openTicket(selected.id);
        load();
      } else {
        const d = await res.json();
        notify(d.message || 'Failed to send reply', 'error');
      }
    } catch { notify('Network error', 'error'); }
    setSaving(false);
  };

  const updateTicket = async (fields) => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/api/system/support-tickets/${selected.id}`, {
        method: 'PATCH', headers: hdr(), body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSelected(prev => ({ ...prev, ...fields }));
        load();
        notify('Ticket updated');
      } else {
        const d = await res.json();
        notify(d.message || 'Failed to update ticket', 'error');
      }
    } catch { notify('Network error', 'error'); }
  };

  return (
    <SystemLayout title="Support Tickets" subtitle="IT requests from every school, in one queue">
      <LedgerSheet title="Ticket Queue" meta={`${tickets.length} in view`}>
        {/* Filter tabs */}
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => setFilter(f.value)}
              sx={{
                fontFamily: FONT, fontWeight: 600, fontSize: '0.78rem',
                bgcolor: filter === f.value ? BLUE : '#fff',
                color: filter === f.value ? '#fff' : INK_SOFT,
                border: `1px solid ${filter === f.value ? BLUE : BORDER}`,
                '&:hover': { bgcolor: filter === f.value ? BLUE : '#F3F4F6' },
              }}
            />
          ))}
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: BLUE }} size={30} />
          </Box>
        ) : (
          <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '6px', bgcolor: '#fff' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['School', 'Subject', 'Priority', 'Status', 'Replies', 'Updated'].map(h => (
                    <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.7rem', color: INK_FAINT, bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.length === 0 && (
                  <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, border: 'none' }}>
                    <Typography sx={{ fontFamily: FONT, color: INK_FAINT, fontSize: '0.85rem' }}>No tickets in this view.</Typography>
                  </TableCell></TableRow>
                )}
                {tickets.map(t => (
                  <TableRow key={t.id} hover onClick={() => openTicket(t.id)} sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.8rem', color: INK, fontWeight: 600 }}>{t.school}</TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.8rem', color: INK }}>{t.subject}</TableCell>
                    <TableCell><PriorityChip value={t.priority} /></TableCell>
                    <TableCell><StatusChip value={t.status} /></TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.8rem', color: INK_SOFT }}>{t.replyCount}</TableCell>
                    <TableCell sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT }}>{fmt(t.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </LedgerSheet>

      {/* Ticket detail dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        {detailLoading || !selected?.description ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: BLUE }} size={26} />
          </Box>
        ) : (
          <>
            <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: INK }}>
              {selected.subject}
              <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: INK_FAINT, mt: 0.3 }}>{selected.school}</Typography>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
              <Stack direction="row" spacing={1.5}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ fontFamily: FONT, fontSize: '0.8rem' }}>Status</InputLabel>
                  <Select
                    label="Status" value={selected.status}
                    onChange={e => updateTicket({ status: e.target.value })}
                    sx={{ fontFamily: FONT, fontSize: '0.8rem' }}
                  >
                    {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                      <MenuItem key={s} value={s} sx={{ fontFamily: FONT, fontSize: '0.8rem', textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ fontFamily: FONT, fontSize: '0.8rem' }}>Priority</InputLabel>
                  <Select
                    label="Priority" value={selected.priority}
                    onChange={e => updateTicket({ priority: e.target.value })}
                    sx={{ fontFamily: FONT, fontSize: '0.8rem' }}
                  >
                    {['low', 'normal', 'high', 'urgent'].map(p => (
                      <MenuItem key={p} value={p} sx={{ fontFamily: FONT, fontSize: '0.8rem', textTransform: 'capitalize' }}>{p}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK, whiteSpace: 'pre-wrap' }}>{selected.description}</Typography>
              </Box>

              <Box sx={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {selected.replies?.map(r => (
                  <Box key={r.id} sx={{
                    alignSelf: r.authorRole === 'system_admin' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    bgcolor: r.authorRole === 'system_admin' ? BLUE : '#F3F4F6',
                    color: r.authorRole === 'system_admin' ? '#fff' : INK,
                    borderRadius: '10px', px: 1.5, py: 1,
                  }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, opacity: 0.75, mb: 0.3 }}>
                      {r.author} · {fmt(r.createdAt)}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{r.message}</Typography>
                  </Box>
                ))}
                {(!selected.replies || selected.replies.length === 0) && (
                  <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK_FAINT, textAlign: 'center', py: 1 }}>No replies yet.</Typography>
                )}
              </Box>

              <TextField
                multiline minRows={2} placeholder="Reply to the school…"
                value={reply} onChange={e => setReply(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { fontFamily: FONT, fontSize: '0.85rem' } }}
              />
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelected(null)} sx={{ textTransform: 'none', fontFamily: FONT, color: INK_SOFT }}>Close</Button>
              <Button variant="contained" disabled={saving || !reply.trim()} onClick={sendReply}
                sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700, bgcolor: BLUE, boxShadow: 'none' }}>
                {saving ? 'Sending…' : 'Send Reply'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: FONT }}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
};

export default SystemTicketsPage;
