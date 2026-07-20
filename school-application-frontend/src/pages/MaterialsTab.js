import API_BASE from '../config';
// MaterialsTab.js — Learning materials/notes the teacher shares with students,
// separate from the AI quiz generator (QuizTab.js). AI quiz generation reads
// from the same /api/teacher/materials data, but uploading/managing the
// materials themselves lives here as its own dedicated tab.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  IconButton, Snackbar, Alert,
} from '@mui/material';
import DeleteIcon         from '@mui/icons-material/Delete';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import ArticleIcon        from '@mui/icons-material/Article';

const C = {
  brand:     '#1A3557',
  accent:    '#2E7D32',
  accentBg:  '#E8F5E9',
  border:    '#B8C2CC',
  headerBg:  '#F8FAFC',
  text:      '#1A2332',
  muted:     '#64748B',
  white:     '#FFFFFF',
  danger:    '#C62828',
  purple:    '#6D28D9',
  purpleBg:  '#EDE9FE',
};

const BASE  = `${API_BASE}`;
const authH = () => ({ Authorization: `Bearer ${sessionStorage.getItem('teacherToken')}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

const Card = ({ children, sx = {} }) => (
  <Box sx={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', ...sx }}>
    {children}
  </Box>
);

const SectionTitle = ({ children }) => (
  <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'IBM Plex Sans', sans-serif", mb: 1.5 }}>
    {children}
  </Typography>
);

export default function MaterialsTab() {
  const [materials,  setMaterials]  = useState([]);
  const [slots,      setSlots]      = useState([]);
  const [snack,      setSnack]      = useState({ open: false, msg: '', sev: 'success' });
  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const [matForm,   setMatForm]   = useState({ title: '', subjectId: '', classId: '', textContent: '' });
  const [matFile,   setMatFile]   = useState(null);
  const [matMode,   setMatMode]   = useState('file'); // 'file' | 'text'
  const [savingMat, setSavingMat] = useState(false);

  const fetchMaterials = useCallback(async () => {
    const res = await fetch(`${BASE}/api/teacher/materials`, { headers: authH() });
    if (res.ok) setMaterials(await res.json());
  }, []);

  const fetchSlots = useCallback(async () => {
    const res = await fetch(`${BASE}/api/teacher/timetable`, { headers: authH() });
    if (res.ok) { const d = await res.json(); setSlots(d.slots || []); }
  }, []);

  useEffect(() => { fetchMaterials(); fetchSlots(); }, [fetchMaterials, fetchSlots]);

  const uniqueClasses  = [...new Map(slots.map(s => [s.classId, { name: s.className, classId: s.classId }])).values()];
  const uniqueSubjects = [...new Map(slots.map(s => [s.subjectId, { name: s.subjectName, subjectId: s.subjectId }])).values()];

  const handleSaveMaterial = async () => {
    if (!matForm.title.trim()) return toast('Title is required', 'error');
    if (matMode === 'file' && !matFile) return toast('Select a file', 'error');
    if (matMode === 'text' && !matForm.textContent.trim()) return toast('Enter text content', 'error');

    setSavingMat(true);
    try {
      let res;
      if (matMode === 'file') {
        const fd = new FormData();
        fd.append('file', matFile);
        fd.append('title', matForm.title);
        if (matForm.subjectId) fd.append('subjectId', matForm.subjectId);
        if (matForm.classId)   fd.append('classId',   matForm.classId);
        res = await fetch(`${BASE}/api/teacher/materials`, { method: 'POST', headers: authH(), body: fd });
      } else {
        res = await fetch(`${BASE}/api/teacher/materials`, { method: 'POST', headers: jsonH(), body: JSON.stringify(matForm) });
      }
      if (res.ok) {
        toast('Material saved — visible to students under this subject');
        setMatForm({ title: '', subjectId: '', classId: '', textContent: '' });
        setMatFile(null);
        fetchMaterials();
      } else {
        const e = await res.json();
        toast(e.message || 'Failed to save', 'error');
      }
    } catch { toast('Network error', 'error'); }
    setSavingMat(false);
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Delete this material? Students will no longer be able to view it.')) return;
    const res = await fetch(`${BASE}/api/teacher/materials/${id}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { toast('Material deleted'); fetchMaterials(); }
    else { const e = await res.json(); toast(e.message || 'Failed to delete', 'error'); }
  };

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '400px 1fr' }, gap: 2.5, alignItems: 'start' }}>
        {/* Upload form */}
        <Card>
          <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${C.border}`, background: C.headerBg }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>Add Learning Material</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", mt: 0.25 }}>PDF, DOCX, TXT — or paste text directly. Students see these grouped by subject.</Typography>
          </Box>
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Title *" value={matForm.title} size="small" fullWidth
              onChange={e => setMatForm(f => ({ ...f, title: e.target.value }))} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="Subject" value={matForm.subjectId} size="small" fullWidth
                onChange={e => setMatForm(f => ({ ...f, subjectId: e.target.value }))}>
                <MenuItem value="">— Any —</MenuItem>
                {uniqueSubjects.map(s => <MenuItem key={s.subjectId} value={s.subjectId}>{s.name}</MenuItem>)}
              </TextField>
              <TextField select label="Class" value={matForm.classId} size="small" fullWidth
                onChange={e => setMatForm(f => ({ ...f, classId: e.target.value }))}>
                <MenuItem value="">— Any —</MenuItem>
                {uniqueClasses.map(c => <MenuItem key={c.classId} value={c.classId}>{c.name}</MenuItem>)}
              </TextField>
            </Box>

            {/* Mode toggle */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[{ k: 'file', label: '📁 Upload File' }, { k: 'text', label: '📝 Paste Text' }].map(m => (
                <Button key={m.k} size="small" onClick={() => setMatMode(m.k)} sx={{
                  flex: 1, textTransform: 'none', fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: '0.78rem', borderRadius: '8px', py: 0.75,
                  background: matMode === m.k ? C.brand : 'transparent',
                  color:      matMode === m.k ? C.white : C.muted,
                  border:    `1.5px solid ${matMode === m.k ? C.brand : C.border}`,
                }}>{m.label}</Button>
              ))}
            </Box>

            {matMode === 'file' ? (
              <Box sx={{ border: `2px dashed ${matFile ? C.accent : C.border}`, borderRadius: '10px', p: 2.5, textAlign: 'center', background: matFile ? C.accentBg : C.headerBg }}>
                <UploadFileIcon sx={{ fontSize: 32, color: matFile ? C.accent : C.muted, mb: 0.75 }} />
                <Typography sx={{ fontSize: '0.8rem', color: matFile ? C.accent : C.muted, fontWeight: matFile ? 700 : 400, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {matFile ? matFile.name : 'Click to choose a PDF, DOCX, or TXT file'}
                </Typography>
                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={e => setMatFile(e.target.files[0] || null)} style={{ display: 'block', margin: '8px auto 0', cursor: 'pointer' }} />
              </Box>
            ) : (
              <TextField label="Paste notes, textbook content, study guide…" value={matForm.textContent}
                onChange={e => setMatForm(f => ({ ...f, textContent: e.target.value }))}
                multiline rows={8} fullWidth size="small"
                helperText={`${matForm.textContent.length.toLocaleString()} characters`} />
            )}

            <Button variant="contained" onClick={handleSaveMaterial} disabled={savingMat}
              sx={{ background: C.purple, textTransform: 'none', fontWeight: 700, boxShadow: 'none', borderRadius: '8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {savingMat ? 'Saving…' : 'Save Material'}
            </Button>
          </Box>
        </Card>

        {/* Materials list */}
        <Box>
          <SectionTitle>{materials.length} Material{materials.length !== 1 ? 's' : ''} Saved</SectionTitle>
          {materials.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6 }}>
              <ArticleIcon sx={{ fontSize: 44, color: C.border, mb: 1 }} />
              <Typography sx={{ color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>No materials yet</Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {materials.map(m => (
                <Card key={m.id}>
                  <Box sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: '10px', background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArticleIcon sx={{ color: C.purple, fontSize: 18 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {m.material_type?.toUpperCase()} · {(m.char_count || 0).toLocaleString()} chars · {new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Typography>
                    </Box>
                    <Chip label="Ready" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem', bgcolor: C.accentBg, color: C.accent }} />
                    <IconButton size="small" onClick={() => handleDeleteMaterial(m.id)} sx={{ color: C.danger }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
