// QuizTab.js — AI Quiz Generator for TeacherDashboard
// Import and render this inside TeacherDashboard.js:
//
//   import QuizTab from './QuizTab';
//   ...
//   {tab === 'quizzes' && <QuizTab />}
//
// Also add to the NAV array in TeacherDashboard:
//   { key:'quizzes', label:'AI Quizzes', icon:<QuizIcon sx={{ fontSize:20 }} /> }
// (import QuizIcon from '@mui/icons-material/Quiz')

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, CircularProgress,
  Divider, Chip, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Alert, LinearProgress,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DeleteIcon         from '@mui/icons-material/Delete';
import AutoFixHighIcon    from '@mui/icons-material/AutoFixHigh';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import EditNoteIcon       from '@mui/icons-material/EditNote';
import PublishIcon        from '@mui/icons-material/Publish';
import BarChartIcon       from '@mui/icons-material/BarChart';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import PendingIcon        from '@mui/icons-material/Pending';
import LockIcon           from '@mui/icons-material/Lock';
import ArticleIcon        from '@mui/icons-material/Article';
import SchoolIcon         from '@mui/icons-material/School';

const C = {
  brand:     '#1A3557',
  accent:    '#2E7D32',
  accentBg:  '#E8F5E9',
  border:    '#E2E8F0',
  headerBg:  '#F8FAFC',
  bg:        '#F0F4F8',
  rowAlt:    '#FAFBFC',
  text:      '#1A2332',
  muted:     '#64748B',
  white:     '#FFFFFF',
  danger:    '#C62828',
  dangerBg:  '#FEE2E2',
  gold:      '#D97706',
  goldBg:    '#FEF3C7',
  purple:    '#6D28D9',
  purpleBg:  '#EDE9FE',
};

const BASE  = '%REACT_APP_API_URL%';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('teacherToken')}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

/* ── Shared small components ── */
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

const statusChip = (status) => {
  const map = {
    draft:     { label: 'Draft',     bg: C.bg,       color: C.muted,   icon: <PendingIcon sx={{ fontSize: 13 }} /> },
    published: { label: 'Live',      bg: C.accentBg, color: C.accent,  icon: <CheckCircleIcon sx={{ fontSize: 13 }} /> },
    closed:    { label: 'Closed',    bg: C.dangerBg, color: C.danger,  icon: <LockIcon sx={{ fontSize: 13 }} /> },
  };
  const s = map[status] || map.draft;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.35, borderRadius: '8px', background: s.bg }}>
      {s.icon}
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.label}</Typography>
    </Box>
  );
};

const difficultyColor = { easy: C.accent, medium: C.gold, hard: C.danger };

/* ════════════════════════════════════════════════════════════
   QUIZ TAB
════════════════════════════════════════════════════════════ */
export default function QuizTab() {
  // -- view: 'quizzes' | 'materials' | 'generate' | 'review' | 'results'
  const [view,        setView]        = useState('quizzes');
  const [quizzes,     setQuizzes]     = useState([]);
  const [materials,   setMaterials]   = useState([]);
  const [slots,       setSlots]       = useState([]);    // teacher's subjects/classes
  const [loading,     setLoading]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [snack,       setSnack]       = useState({ open: false, msg: '', sev: 'success' });
  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  // -- material upload state
  const [matForm,  setMatForm]  = useState({ title: '', subjectId: '', classId: '', textContent: '' });
  const [matFile,  setMatFile]  = useState(null);
  const [matMode,  setMatMode]  = useState('file'); // 'file' | 'text'
  const [savingMat, setSavingMat] = useState(false);

  // -- generation config
  const [genConfig, setGenConfig] = useState({
    materialIds: [], subjectId: '', classId: '', questionCount: 10,
    difficulty: 'medium', topic: '', timeLimitMinutes: 30,
    provider: 'auto',
  });

  // -- generated / edited questions
  const [reviewData, setReviewData] = useState(null); // { suggestedTitle, questions }
  const [quizTitle,  setQuizTitle]  = useState('');
  const [savingQuiz, setSavingQuiz] = useState(false);

  // -- publish dialog
  const [publishDialog, setPublishDialog] = useState(null); // { quizId, title }
  const [closesAt,      setClosesAt]      = useState('');
  const [publishing,    setPublishing]    = useState(false);

  // -- results view
  const [resultsData, setResultsData] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  /* ── Fetch ── */
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/teacher/quizzes`, { headers: authH() });
    if (res.ok) setQuizzes(await res.json());
    setLoading(false);
  }, []);

  const fetchMaterials = useCallback(async () => {
    const res = await fetch(`${BASE}/api/teacher/materials`, { headers: authH() });
    if (res.ok) setMaterials(await res.json());
  }, []);

  const fetchSlots = useCallback(async () => {
    const res = await fetch(`${BASE}/api/teacher/timetable`, { headers: authH() });
    if (res.ok) {
      const d = await res.json();
      setSlots(d.slots || []);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    fetchMaterials();
    fetchSlots();
  }, [fetchQuizzes, fetchMaterials, fetchSlots]);

  /* Derived class/subject options from timetable slots */
  const uniqueClasses  = [...new Map(slots.map(s => [s.classId, { name: s.className, classId: s.classId }])).values()];
  const uniqueSubjects = [...new Map(slots.map(s => [s.subjectId, { name: s.subjectName, subjectId: s.subjectId }])).values()];

  /* ── Save material ── */
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
        toast('Material saved');
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

  /* ── Generate quiz ── */
  const handleGenerate = async () => {
    if (!genConfig.materialIds.length) return toast('Select at least one material', 'error');
    if (!genConfig.classId)            return toast('Select a class', 'error');
    if (!genConfig.subjectId)          return toast('Select a subject', 'error');

    setGenerating(true);
    try {
      const res = await fetch(`${BASE}/api/teacher/quizzes/generate`, { method: 'POST', headers: jsonH(), body: JSON.stringify(genConfig) });
      const d   = await res.json();
      if (!res.ok) { toast(d.message || 'Generation failed', 'error'); setGenerating(false); return; }
      setReviewData(d);
      setQuizTitle(d.suggestedTitle || 'Weekly Quiz');
      toast(`Generated by ${d.provider === 'gemini' ? '✨ Gemini' : '⚡ Groq'} AI`, 'success');
      setView('review');
    } catch { toast('Network error', 'error'); }
    setGenerating(false);
  };

  /* ── Save quiz ── */
  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) return toast('Quiz title is required', 'error');
    setSavingQuiz(true);
    try {
      const res = await fetch(`${BASE}/api/teacher/quizzes`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({
          title:             quizTitle,
          subjectId:         genConfig.subjectId,
          classId:           genConfig.classId,
          timeLimitMinutes:  genConfig.timeLimitMinutes,
          difficulty:        genConfig.difficulty,
          questions:         reviewData.questions,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast('Quiz saved as draft — publish when ready');
        setView('quizzes');
        fetchQuizzes();
        setReviewData(null);
      } else {
        toast(d.message || 'Failed to save quiz', 'error');
      }
    } catch { toast('Network error', 'error'); }
    setSavingQuiz(false);
  };

  /* ── Publish quiz ── */
  const handlePublish = async () => {
    if (!publishDialog) return;
    setPublishing(true);
    try {
      const res = await fetch(`${BASE}/api/teacher/quizzes/${publishDialog.quizId}/publish`, {
        method: 'PATCH', headers: jsonH(),
        body: JSON.stringify({ closesAt: closesAt || null }),
      });
      if (res.ok) {
        toast('Quiz is now live for students!');
        setPublishDialog(null);
        setClosesAt('');
        fetchQuizzes();
      } else {
        const e = await res.json();
        toast(e.message || 'Failed to publish', 'error');
      }
    } catch { toast('Network error', 'error'); }
    setPublishing(false);
  };

  /* ── Close quiz ── */
  const handleClose = async (quizId) => {
    const res = await fetch(`${BASE}/api/teacher/quizzes/${quizId}/close`, { method: 'PATCH', headers: jsonH() });
    if (res.ok) { toast('Quiz closed'); fetchQuizzes(); }
    else toast('Failed to close quiz', 'error');
  };

  /* ── Delete quiz ── */
  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz? All student results will be lost.')) return;
    const res = await fetch(`${BASE}/api/teacher/quizzes/${quizId}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { toast('Quiz deleted'); fetchQuizzes(); }
    else toast('Failed to delete', 'error');
  };

  /* ── Delete material ── */
  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    const res = await fetch(`${BASE}/api/teacher/materials/${id}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { toast('Material deleted'); fetchMaterials(); }
    else toast('Failed to delete', 'error');
  };

  /* ── Load results ── */
  const loadResults = async (quizId) => {
    setResultsLoading(true);
    setResultsData(null);
    setView('results');
    const res = await fetch(`${BASE}/api/teacher/quizzes/${quizId}/results`, { headers: authH() });
    if (res.ok) setResultsData(await res.json());
    setResultsLoading(false);
  };

  /* ── Edit question in review ── */
  const updateQuestion = (idx, field, value) => {
    setReviewData(d => ({ ...d, questions: d.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q) }));
  };
  const deleteQuestion = (idx) => {
    setReviewData(d => ({ ...d, questions: d.questions.filter((_, i) => i !== idx) }));
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <>
      {/* ── Top sub-nav ── */}
      <Card sx={{ mb: 2.5, borderRadius: '12px' }}>
        <Box sx={{ px: 2.5, py: 1.75, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { key: 'quizzes',   label: 'My Quizzes',  icon: <SchoolIcon sx={{ fontSize: 16 }} /> },
              { key: 'materials', label: 'Study Materials', icon: <ArticleIcon sx={{ fontSize: 16 }} /> },
              { key: 'generate',  label: 'Generate Quiz',   icon: <AutoFixHighIcon sx={{ fontSize: 16 }} /> },
            ].map(v => (
              <Button key={v.key} size="small" startIcon={v.icon} onClick={() => setView(v.key)} sx={{
                textTransform: 'none', fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: '0.8rem', px: 1.75, py: 0.75, borderRadius: '8px',
                background: view === v.key ? C.purple : 'transparent',
                color:      view === v.key ? C.white  : C.muted,
                border:    `1.5px solid ${view === v.key ? C.purple : C.border}`,
                '&:hover': { background: view === v.key ? C.purple : C.headerBg },
              }}>{v.label}</Button>
            ))}
          </Box>
          <Chip label={`${materials.length} material${materials.length !== 1 ? 's' : ''} uploaded`} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: C.purpleBg, color: C.purple }} />
        </Box>
      </Card>

      {/* ══════════════════════════════════════════════
          VIEW: QUIZZES LIST
      ══════════════════════════════════════════════ */}
      {view === 'quizzes' && (
        <Box>
          <SectionTitle>All Quizzes</SectionTitle>
          {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: C.brand }} /></Box>
          : quizzes.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 8 }}>
              <AutoFixHighIcon sx={{ fontSize: 52, color: C.border, mb: 1.5 }} />
              <Typography sx={{ color: C.muted, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>No quizzes yet</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", mt: 0.5 }}>Upload study materials, then use Generate Quiz to create your first quiz.</Typography>
              <Button onClick={() => setView('materials')} variant="contained" sx={{ mt: 2.5, background: C.purple, textTransform: 'none', fontWeight: 700, borderRadius: '8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Upload Materials First
              </Button>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {quizzes.map(q => (
                <Card key={q.id}>
                  <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>{q.title}</Typography>
                        {statusChip(q.status)}
                        <Chip label={q.difficulty} size="small" sx={{ height: 18, fontSize: '0.66rem', fontWeight: 700, textTransform: 'capitalize', color: difficultyColor[q.difficulty] || C.muted, bgcolor: difficultyColor[q.difficulty] + '18' }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.78rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {q.subjectName} · {q.className} · {q.totalQuestions || q.total_questions} questions · {q.timeLimitMinutes || q.time_limit_minutes} min
                      </Typography>
                      {q.status === 'published' && q.publishedAt && (
                        <Typography sx={{ fontSize: '0.72rem', color: C.accent, fontFamily: "'IBM Plex Sans', sans-serif", mt: 0.25 }}>
                          Live since {new Date(q.publishedAt || q.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {(q.attemptCount || 0) > 0 && ` · ${q.attemptCount} attempt${q.attemptCount !== 1 ? 's' : ''}`}
                        </Typography>
                      )}
                    </Box>
                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, flexWrap: 'wrap' }}>
                      {q.status === 'draft' && (
                        <Button size="small" variant="contained" startIcon={<PublishIcon sx={{ fontSize: 14 }} />}
                          onClick={() => setPublishDialog({ quizId: q.id, title: q.title })}
                          sx={{ background: C.accent, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: '7px', boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Publish
                        </Button>
                      )}
                      {q.status === 'published' && (
                        <Button size="small" variant="outlined" onClick={() => handleClose(q.id)}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderColor: C.danger, color: C.danger, borderRadius: '7px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Close Quiz
                        </Button>
                      )}
                      <Button size="small" variant="outlined" startIcon={<BarChartIcon sx={{ fontSize: 14 }} />}
                        onClick={() => loadResults(q.id)}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderColor: C.brand, color: C.brand, borderRadius: '7px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        Results
                      </Button>
                      <IconButton size="small" onClick={() => handleDelete(q.id)} sx={{ color: C.danger }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ══════════════════════════════════════════════
          VIEW: MATERIALS
      ══════════════════════════════════════════════ */}
      {view === 'materials' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '400px 1fr' }, gap: 2.5, alignItems: 'start' }}>
          {/* Upload form */}
          <Card>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${C.border}`, background: C.headerBg }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>Add Study Material</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", mt: 0.25 }}>PDF, DOCX, TXT — or paste text directly</Typography>
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
                  helperText={`${matForm.textContent.length.toLocaleString()} characters — more text = better quiz quality`} />
              )}

              <Button variant="contained" onClick={handleSaveMaterial} disabled={savingMat}
                sx={{ background: C.purple, textTransform: 'none', fontWeight: 700, boxShadow: 'none', borderRadius: '8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {savingMat ? 'Saving & extracting text…' : 'Save Material'}
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
      )}

      {/* ══════════════════════════════════════════════
          VIEW: GENERATE
      ══════════════════════════════════════════════ */}
      {view === 'generate' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, alignItems: 'start' }}>
          {/* Config panel */}
          <Card>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${C.border}`, background: C.headerBg }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHighIcon sx={{ color: C.purple, fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>AI Quiz Generator</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", mt: 0.25 }}>
                Claude reads your materials and generates questions only from what's inside them
              </Typography>
            </Box>
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField select label="Subject *" value={genConfig.subjectId} size="small" fullWidth
                  onChange={e => setGenConfig(g => ({ ...g, subjectId: e.target.value }))}>
                  <MenuItem value="">— Select —</MenuItem>
                  {uniqueSubjects.map(s => <MenuItem key={s.subjectId} value={s.subjectId}>{s.name}</MenuItem>)}
                </TextField>
                <TextField select label="Class *" value={genConfig.classId} size="small" fullWidth
                  onChange={e => setGenConfig(g => ({ ...g, classId: e.target.value }))}>
                  <MenuItem value="">— Select —</MenuItem>
                  {uniqueClasses.map(c => <MenuItem key={c.classId} value={c.classId}>{c.name}</MenuItem>)}
                </TextField>
              </Box>

              {/* Materials selector */}
              <Box>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", mb: 1 }}>
                  Select Source Materials * (AI reads only these)
                </Typography>
                {materials.length === 0 ? (
                  <Box sx={{ p: 2, border: `1px solid ${C.border}`, borderRadius: '8px', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.8rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      No materials yet — <Button size="small" onClick={() => setView('materials')} sx={{ textTransform: 'none', fontWeight: 700, color: C.purple, fontFamily: "'IBM Plex Sans', sans-serif", p: 0, minWidth: 0 }}>add some first</Button>
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 200, overflowY: 'auto', p: 0.5, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
                    {materials.map(m => {
                      const selected = genConfig.materialIds.includes(m.id);
                      return (
                        <Box key={m.id} onClick={() => setGenConfig(g => ({ ...g, materialIds: selected ? g.materialIds.filter(x => x !== m.id) : [...g.materialIds, m.id] }))}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, borderRadius: '7px', cursor: 'pointer', border: `1.5px solid ${selected ? C.purple : 'transparent'}`, background: selected ? C.purpleBg : 'transparent', transition: 'all 0.12s' }}>
                          <Box sx={{ width: 18, height: 18, borderRadius: '5px', border: `2px solid ${selected ? C.purple : C.border}`, background: selected ? C.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {selected && <CheckCircleIcon sx={{ fontSize: 12, color: C.white }} />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: selected ? 700 : 400, color: selected ? C.purple : C.text, fontFamily: "'IBM Plex Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>{(m.char_count || 0).toLocaleString()} chars</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                {genConfig.materialIds.length > 0 && (
                  <Typography sx={{ fontSize: '0.72rem', color: C.purple, fontWeight: 700, mt: 0.75, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    ✓ {genConfig.materialIds.length} material{genConfig.materialIds.length !== 1 ? 's' : ''} selected
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField select label="Questions" value={genConfig.questionCount} size="small" fullWidth
                  onChange={e => setGenConfig(g => ({ ...g, questionCount: e.target.value }))}>
                  {[5, 8, 10, 15, 20, 25, 30].map(n => <MenuItem key={n} value={n}>{n} questions</MenuItem>)}
                </TextField>
                <TextField select label="Difficulty" value={genConfig.difficulty} size="small" fullWidth
                  onChange={e => setGenConfig(g => ({ ...g, difficulty: e.target.value }))}>
                  <MenuItem value="easy">Easy — recall facts</MenuItem>
                  <MenuItem value="medium">Medium — understanding</MenuItem>
                  <MenuItem value="hard">Hard — application</MenuItem>
                </TextField>
              </Box>

              <TextField label="Topic focus (optional)" size="small" fullWidth
                placeholder="e.g. 'Cell division' or 'World War II causes'"
                value={genConfig.topic}
                helperText="Leave blank to cover all topics in the selected materials"
                onChange={e => setGenConfig(g => ({ ...g, topic: e.target.value }))} />

              <TextField label="Time limit (minutes)" type="number" size="small" fullWidth
                value={genConfig.timeLimitMinutes}
                inputProps={{ min: 5, max: 120, step: 5 }}
                onChange={e => setGenConfig(g => ({ ...g, timeLimitMinutes: e.target.value }))} />

              {/* Provider selector */}
              <Box sx={{ p:1.5, borderRadius:'10px', background:'#F8F7FF', border:`1px solid #DDD6FE` }}>
                <Typography sx={{ fontSize:'0.78rem', fontWeight:600, color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mb:1 }}>
                  🤖 AI Provider
                </Typography>
                <Box sx={{ display:'flex', gap:1 }}>
                  {[
                    { key:'auto',   label:'🔄 Auto-rotate', desc:'Alternates between both AIs for variety' },
                    { key:'groq',   label:'⚡ Groq',         desc:'Llama 3.3 — fast' },
                    { key:'gemini', label:'✨ Gemini',        desc:'Google — different style' },
                  ].map(opt => (
                    <Box key={opt.key} onClick={() => setGenConfig(g => ({ ...g, provider: opt.key }))}
                      title={opt.desc}
                      sx={{ flex:1, px:1, py:0.75, borderRadius:'8px', cursor:'pointer', textAlign:'center', border:`1.5px solid ${genConfig.provider===opt.key?C.purple:C.border}`, background:genConfig.provider===opt.key?C.purpleBg:'transparent', transition:'all 0.15s' }}>
                      <Typography sx={{ fontSize:'0.75rem', fontWeight:genConfig.provider===opt.key?700:500, color:genConfig.provider===opt.key?C.purple:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{opt.label}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize:'0.68rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mt:0.75 }}>
                  Auto-rotate uses both AIs so each quiz has a different style
                </Typography>
              </Box>

              <Button variant="contained" onClick={handleGenerate}
                disabled={generating || !genConfig.materialIds.length || !genConfig.classId || !genConfig.subjectId}
                startIcon={generating ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <AutoFixHighIcon />}
                sx={{ background: `linear-gradient(135deg, ${C.purple}, #8B5CF6)`, textTransform: 'none', fontWeight: 700, py: 1.25, boxShadow: 'none', borderRadius: '10px', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem' }}>
                {generating ? 'Generating… AI is reading your materials' : `Generate ${genConfig.questionCount} Questions with AI`}
              </Button>

              {generating && <LinearProgress sx={{ borderRadius: 2, '& .MuiLinearProgress-bar': { background: C.purple } }} />}
            </Box>
          </Card>

          {/* How it works info card */}
          <Card sx={{ background: `linear-gradient(135deg, ${C.purple}08, ${C.purpleBg})`, border: `1px solid ${C.purple}30` }}>
            <Box sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: C.purple, fontFamily: "'IBM Plex Sans', sans-serif", mb: 2 }}>
                🤖 How AI Quiz Generation Works
              </Typography>
              {[
                { step: '1', title: 'Upload your materials', desc: 'Add PDFs, Word docs, or paste text — textbook chapters, study guides, your own notes' },
                { step: '2', title: 'Configure & generate', desc: 'Select materials, subject, class and difficulty. Claude reads ONLY what you uploaded.' },
                { step: '3', title: 'Review & edit', desc: 'Check every question before posting. Edit, delete, or regenerate any question.' },
                { step: '4', title: 'Publish to students', desc: 'Students see the quiz, attempt it with a timer. The system auto-marks and shows results.' },
              ].map(item => (
                <Box key={item.step} sx={{ display: 'flex', gap: 1.5, mb: 1.75 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ color: C.white, fontWeight: 800, fontSize: '0.75rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>{item.step}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>{item.title}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5 }}>{item.desc}</Typography>
                  </Box>
                </Box>
              ))}
              <Box sx={{ mt: 2, p: 1.5, borderRadius: '8px', background: C.purple + '14', border: `1px solid ${C.purple}30` }}>
                <Typography sx={{ fontSize: '0.75rem', color: C.purple, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  🔒 The AI only uses your uploaded materials — no external websites, Wikipedia, or other sources.
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      )}

      {/* ══════════════════════════════════════════════
          VIEW: REVIEW GENERATED QUIZ
      ══════════════════════════════════════════════ */}
      {view === 'review' && reviewData && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <TextField value={quizTitle} onChange={e => setQuizTitle(e.target.value)} size="small"
                sx={{ minWidth: 320 }} InputProps={{ sx: { fontWeight: 700, fontSize: '1.1rem', fontFamily: "'IBM Plex Sans', sans-serif" } }} />
              <Typography sx={{ fontSize: '0.78rem', color: C.muted, mt: 0.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {reviewData.questions.length} questions · {reviewData.materialCount} material{reviewData.materialCount !== 1 ? 's' : ''} · generated by {reviewData.provider === 'gemini' ? '✨ Gemini' : '⚡ Groq'} AI. Edit or delete below.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setView('generate')} sx={{ textTransform: 'none', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>← Back</Button>
              <Button variant="contained" onClick={handleSaveQuiz} disabled={savingQuiz || !reviewData.questions.length}
                sx={{ background: C.purple, textTransform: 'none', fontWeight: 700, boxShadow: 'none', borderRadius: '8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {savingQuiz ? 'Saving…' : 'Save Quiz (Draft)'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {reviewData.questions.map((q, idx) => (
              <Card key={idx}>
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: '8px', background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: C.purple, fontFamily: "'IBM Plex Sans', sans-serif" }}>{idx + 1}</Typography>
                      </Box>
                      {q.topic && <Chip label={q.topic} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: C.headerBg, color: C.muted }} />}
                    </Box>
                    <IconButton size="small" onClick={() => deleteQuestion(idx)} sx={{ color: C.danger }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <TextField fullWidth size="small" multiline value={q.question}
                    onChange={e => updateQuestion(idx, 'question', e.target.value)}
                    sx={{ mb: 1.5, '& .MuiInputBase-input': { fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" } }} />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1.5 }}>
                    {(q.options || []).map((opt, oi) => {
                      const letter = ['A', 'B', 'C', 'D'][oi];
                      const isCorrect = q.correct === letter;
                      return (
                        <Box key={oi} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 1, borderRadius: '7px', border: `1.5px solid ${isCorrect ? C.accent : C.border}`, background: isCorrect ? C.accentBg : 'transparent' }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: '6px', background: isCorrect ? C.accent : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                            onClick={() => updateQuestion(idx, 'correct', letter)}>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: isCorrect ? C.white : C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>{letter}</Typography>
                          </Box>
                          <TextField variant="standard" size="small" value={opt.slice(3)} // strip "A. " prefix
                            onChange={e => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oi] = `${letter}. ${e.target.value}`;
                              updateQuestion(idx, 'options', newOpts);
                            }}
                            sx={{ flex: 1, '& input': { fontSize: '0.82rem', fontFamily: "'IBM Plex Sans', sans-serif" } }} />
                        </Box>
                      );
                    })}
                  </Box>

                  {q.explanation && (
                    <Box sx={{ p: 1.25, borderRadius: '7px', background: C.accentBg, border: `1px solid #A7F3D0` }}>
                      <Typography sx={{ fontSize: '0.75rem', color: C.accent, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        💡 {q.explanation}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5, gap: 1 }}>
            <Button onClick={() => setView('generate')} sx={{ textTransform: 'none', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>← Regenerate</Button>
            <Button variant="contained" onClick={handleSaveQuiz} disabled={savingQuiz || !reviewData.questions.length}
              sx={{ background: C.purple, textTransform: 'none', fontWeight: 700, boxShadow: 'none', borderRadius: '8px', px: 3, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {savingQuiz ? 'Saving…' : `Save ${reviewData.questions.length} Questions as Draft`}
            </Button>
          </Box>
        </Box>
      )}

      {/* ══════════════════════════════════════════════
          VIEW: RESULTS
      ══════════════════════════════════════════════ */}
      {view === 'results' && (
        <Box>
          <Button onClick={() => setView('quizzes')} sx={{ mb: 2, textTransform: 'none', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>← Back to Quizzes</Button>
          {resultsLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.purple }} /></Box>
          : resultsData ? (
            <Box>
              {/* Stats summary */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
                {[
                  { label: 'Attempts',   value: resultsData.stats?.attempts || 0 },
                  { label: 'Class Avg',  value: resultsData.stats?.avgPct ? `${parseFloat(resultsData.stats.avgPct).toFixed(1)}%` : '—' },
                  { label: 'Highest',    value: resultsData.stats?.maxPct ? `${parseFloat(resultsData.stats.maxPct).toFixed(1)}%` : '—' },
                  { label: 'Lowest',     value: resultsData.stats?.minPct ? `${parseFloat(resultsData.stats.minPct).toFixed(1)}%` : '—' },
                ].map(s => (
                  <Card key={s.label} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.label}</Typography>
                  </Card>
                ))}
              </Box>

              {/* Student results table */}
              <Card>
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${C.border}`, background: C.headerBg }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Student Results — {resultsData.quiz?.title}
                  </Typography>
                </Box>
                {resultsData.attempts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography sx={{ color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>No submissions yet.</Typography>
                  </Box>
                ) : (
                  <Box>
                    {resultsData.attempts.map((a, idx) => {
                      const pct   = parseFloat(a.percentage) || 0;
                      const color = pct >= 75 ? C.accent : pct >= 50 ? C.gold : C.danger;
                      const bg    = pct >= 75 ? C.accentBg : pct >= 50 ? C.goldBg : C.dangerBg;
                      return (
                        <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.75, borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? C.white : C.rowAlt, gap: 2, flexWrap: 'wrap' }}>
                          <Box sx={{ flex: 1, minWidth: 160 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>{a.firstName} {a.lastName}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'monospace' }}>{a.studentNumber}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 120 }}>
                              <Box sx={{ height: 6, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                              </Box>
                            </Box>
                            <Typography sx={{ fontSize: '0.82rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", minWidth: 40 }}>{a.score}/{a.total}</Typography>
                            <Box sx={{ px: 1.25, py: 0.4, borderRadius: '8px', background: bg, minWidth: 55, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color, fontFamily: "'IBM Plex Sans', sans-serif" }}>{pct.toFixed(1)}%</Typography>
                            </Box>
                            {a.time_taken_seconds && (
                              <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>{Math.floor(a.time_taken_seconds / 60)}m {a.time_taken_seconds % 60}s</Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Card>
            </Box>
          ) : null}
        </Box>
      )}

      {/* ── Publish Dialog ── */}
      <Dialog open={!!publishDialog} onClose={() => setPublishDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Publish Quiz
          <Typography sx={{ fontSize: '0.8rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, mt: 0.25 }}>{publishDialog?.title}</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: '8px', background: C.accentBg, border: `1px solid #A7F3D0` }}>
            <Typography sx={{ fontSize: '0.8rem', color: C.accent, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              ✓ Once published, students in the class can see and attempt this quiz immediately.
            </Typography>
          </Box>
          <TextField label="Close date/time (optional)" type="datetime-local" size="small" fullWidth
            value={closesAt}
            onChange={e => setClosesAt(e.target.value)}
            inputProps={{ min: new Date().toISOString().slice(0, 16) }}
            InputLabelProps={{ shrink: true }}
            helperText={closesAt && new Date(closesAt) <= new Date()
              ? 'This date is in the past — students won\'t see the quiz!'
              : 'Leave blank to keep open until you manually close it'}
            error={!!(closesAt && new Date(closesAt) <= new Date())}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setPublishDialog(null)} sx={{ textTransform: 'none', color: C.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handlePublish} disabled={publishing}
            sx={{ background: C.accent, textTransform: 'none', fontWeight: 700, boxShadow: 'none', borderRadius: '8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {publishing ? 'Publishing…' : 'Publish Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
}

