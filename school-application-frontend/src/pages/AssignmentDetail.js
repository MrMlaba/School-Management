import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Divider,
  CircularProgress, Alert, LinearProgress, Chip,
} from '@mui/material';
import UploadFileIcon        from '@mui/icons-material/UploadFile';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon     from '@mui/icons-material/CalendarMonth';
import SchoolIcon            from '@mui/icons-material/School';
import HourglassEmptyIcon    from '@mui/icons-material/HourglassEmpty';
import EmojiEventsIcon       from '@mui/icons-material/EmojiEvents';
import RefreshIcon           from '@mui/icons-material/Refresh';
import InsertDriveFileIcon   from '@mui/icons-material/InsertDriveFile';
import WarningAmberIcon      from '@mui/icons-material/WarningAmber';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const C = {
  navy:     '#0B1F3A',
  brand:    '#1A3557',
  muted:    '#6B7C93',
  border:   '#E3E8F0',
  white:    '#FFFFFF',
  bg:       '#F4F6FB',
  success:  '#1A8A5A',
  successBg:'#E6F7F0',
  warn:     '#B45309',
  warnBg:   '#FEF3C7',
  danger:   '#B91C1C',
  dangerBg: '#FEE2E2',
  gold:     '#D4A843',
  goldBg:   '#FFFBEB',
};

const BASE = 'https://school-management-production-6167.up.railway.app';

/* ─── JWT helper ─────────────────────────────────────────────────────────── */
const getStudentIdFromToken = () => {
  try {
    const token = localStorage.getItem('studentToken');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).id ?? null;
  } catch { return null; }
};

/* ─── Grade colour ───────────────────────────────────────────────────────── */
const gradeColor = (pct) => {
  const p = parseFloat(pct);
  if (isNaN(p)) return { text: C.muted,   bg: C.bg,         border: C.border };
  if (p >= 75)  return { text: C.success, bg: C.successBg,  border: '#6EE7B7' };
  if (p >= 50)  return { text: C.warn,    bg: C.warnBg,     border: '#FCD34D' };
  return              { text: C.danger,   bg: C.dangerBg,   border: '#FCA5A5' };
};

const gradeLabel = (pct) => {
  const p = parseFloat(pct);
  if (isNaN(p)) return '';
  if (p >= 80)  return 'Outstanding';
  if (p >= 70)  return 'Good';
  if (p >= 60)  return 'Satisfactory';
  if (p >= 50)  return 'Pass';
  return 'Below Pass';
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtDate = (d, opts = {}) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...opts }) : '—';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/* ══════════════════════════════════════════════════════════════════════════
   CIRCULAR SCORE WIDGET
══════════════════════════════════════════════════════════════════════════ */
const ScoreRing = ({ percentage, marksObtained, totalMarks }) => {
  const pct   = parseFloat(percentage) || 0;
  const gc    = gradeColor(pct);
  const label = gradeLabel(pct);

  // SVG ring
  const r = 54, cx = 64, cy = 64;
  const circ       = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct / 100);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
      <Box sx={{ position: 'relative', width: 128, height: 128 }}>
        <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="10" />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={gc.text} strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        {/* Centre text */}
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: gc.text, lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>
            {Math.round(pct)}%
          </Typography>
        </Box>
      </Box>

      {/* Score fraction */}
      <Typography sx={{ mt: 1, fontSize: '0.9rem', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
        <strong style={{ color: gc.text, fontSize: '1.05rem' }}>{marksObtained}</strong>
        {' / '}{totalMarks ?? '—'} marks
      </Typography>

      {/* Grade label badge */}
      <Box sx={{ mt: 1, px: 2, py: 0.4, borderRadius: '20px', background: gc.bg, border: `1px solid ${gc.border}` }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: gc.text, fontFamily: "'DM Sans', sans-serif" }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function AssignmentDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [assignment,    setAssignment]    = useState(null);
  const [submission,    setSubmission]    = useState(undefined); // undefined = loading, null = none
  const [pageLoading,   setPageLoading]   = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [uploadProgress,setUploadProgress]= useState(0);
  const [resubmitMode,  setResubmitMode]  = useState(false);
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [error,         setError]         = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fileInputRef = useRef(null);
  const token        = localStorage.getItem('studentToken');

  /* ── Auth check ── */
  useEffect(() => {
    if (!token) navigate('/student-login');
  }, [token, navigate]);

  /* ── Load assignment + existing submission in parallel ── */
  const loadData = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`${BASE}/api/student/assignments`,                  { headers }),
        fetch(`${BASE}/api/student/assignments/${id}/submission`, { headers }),
      ]);

      if (aRes.status === 401 || sRes.status === 401) {
        localStorage.removeItem('studentToken');
        navigate('/student-login');
        return;
      }

      if (aRes.ok) {
        const list = await aRes.json();
        setAssignment(list.find(a => String(a.id) === String(id)) || null);
      }

      if (sRes.ok) {
        setSubmission(await sRes.json()); // null means no submission yet
      } else {
        setSubmission(null);
      }
    } catch (err) {
      console.error('[AssignmentDetail]', err);
      setError('Failed to load. Please refresh the page.');
    } finally {
      setPageLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── File select ── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
    setError('');
    setSelectedFile(file);
  };

  /* ── Delete previous (ungraded) submission then re-enable upload ── */
  const handleClearAndResubmit = async () => {
    setDeleteLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/api/student/assignments/${id}/submission`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSubmission(null);
        setResubmitMode(false);
        setSelectedFile(null);
      } else {
        const d = await res.json();
        setError(d.message || 'Could not clear submission.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── Upload & submit ── */
  const handleSubmit = () => {
    if (!selectedFile) { setError('Please select a file.'); return; }
    if (!token) { navigate('/student-login'); return; }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    const studentId = getStudentIdFromToken();
    if (studentId) formData.append('studentId', studentId);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200 || xhr.status === 201) {
        setSelectedFile(null);
        setUploadProgress(0);
        setResubmitMode(false);
        loadData(); // refresh submission state from server
      } else {
        try { setError(JSON.parse(xhr.responseText).message || 'Submission failed.'); }
        catch { setError('Submission failed. Please try again.'); }
      }
    };
    xhr.onerror = () => { setUploading(false); setError('Network error.'); };
    xhr.open('POST', `${BASE}/api/assignments/${id}/submit`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  /* ── Derived state ── */
  const isOverdue  = assignment?.dueDate && new Date(assignment.dueDate) < new Date();
  const isGraded   = submission && submission.gradedAt != null;
  const isPending  = submission && !isGraded;

  /* ── Loading state ── */
  if (pageLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: C.bg }}>
      <CircularProgress sx={{ color: C.brand }} />
    </Box>
  );

  if (!assignment) return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Alert severity="error" sx={{ mb: 2 }}>Assignment not found.</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/student-dashboard')}
        sx={{ textTransform: 'none', color: C.brand }}>Back to Dashboard</Button>
    </Box>
  );

  /* ── Upload form (shared by first submit and resubmit) ── */
  const UploadForm = () => (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!uploading) handleFileChange({ target: { files: e.dataTransfer.files } }); }}
        sx={{
          border: `2px dashed ${selectedFile ? C.brand : C.border}`,
          borderRadius: '12px', p: 4, textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: selectedFile ? '#EEF6FF' : C.bg,
          transition: 'all 0.15s',
          '&:hover': !uploading ? { borderColor: C.brand, background: '#EEF6FF' } : {},
          mb: 2,
        }}
      >
        <UploadFileIcon sx={{ fontSize: 44, color: selectedFile ? C.brand : C.border, mb: 1 }} />
        {selectedFile ? (
          <>
            <Typography sx={{ fontWeight: 700, color: C.brand, fontFamily: "'DM Sans', sans-serif" }}>{selectedFile.name}</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: C.muted, mt: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </Typography>
          </>
        ) : (
          <>
            <Typography sx={{ fontWeight: 600, color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
              Click or drag your file here
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: C.muted, mt: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
              PDF, Word, images — max 10 MB
            </Typography>
          </>
        )}
      </Box>

      <input ref={fileInputRef} type="file" style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" onChange={handleFileChange} />

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress}
            sx={{ height: 6, borderRadius: 3, mb: 0.5, '& .MuiLinearProgress-bar': { background: C.brand } }} />
          <Typography sx={{ fontSize: '0.75rem', color: C.muted, textAlign: 'right', fontFamily: "'DM Sans', sans-serif" }}>
            Uploading… {uploadProgress}%
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        {resubmitMode && (
          <Button onClick={() => { setResubmitMode(false); setSelectedFile(null); setError(''); }}
            disabled={uploading} sx={{ textTransform: 'none', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </Button>
        )}
        <Button variant="contained" onClick={handleSubmit}
          disabled={!selectedFile || uploading}
          sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none',
            borderRadius: '10px', px: 3, fontFamily: "'DM Sans', sans-serif",
            '&:disabled': { background: C.border } }}>
          {uploading ? 'Submitting…' : resubmitMode ? 'Submit New Version' : 'Submit Assignment'}
        </Button>
      </Box>
    </Box>
  );

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');`}</style>

      <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

        {/* Back */}
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/student-dashboard')}
          sx={{ textTransform: 'none', color: C.muted, mb: 3, pl: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          Back to Dashboard
        </Button>

        {/* ── Assignment info card ── */}
        <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '16px', p: 3, mb: 3, background: C.white }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: C.brand, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}>
              {assignment.title}
            </Typography>
            {isOverdue && !submission && (
              <Chip label="Overdue" size="small" icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: C.dangerBg, color: C.danger, border: `1px solid #FCA5A5` }} />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: assignment.description ? 2 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SchoolIcon sx={{ fontSize: 15, color: C.muted }} />
              <Typography sx={{ fontSize: '0.83rem', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                {assignment.className} · {assignment.subjectName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarMonthIcon sx={{ fontSize: 15, color: isOverdue && !isGraded ? C.danger : C.muted }} />
              <Typography sx={{ fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif",
                color: isOverdue && !isGraded ? C.danger : C.muted,
                fontWeight: isOverdue && !isGraded ? 700 : 400 }}>
                Due: {fmtDate(assignment.dueDate, { weekday: 'long' })}
              </Typography>
            </Box>
            {assignment.totalMarks && (
              <Typography sx={{ fontSize: '0.83rem', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                Out of <strong style={{ color: C.brand }}>{assignment.totalMarks}</strong> marks
              </Typography>
            )}
          </Box>

          {assignment.description && (
            <>
              <Divider sx={{ my: 2, borderColor: C.border }} />
              <Typography sx={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>
                {assignment.description}
              </Typography>
            </>
          )}
        </Paper>

        {/* ══════════════════════════════════════════════════════
            SUBMISSION PANEL  — three states
        ══════════════════════════════════════════════════════ */}
        <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', background: C.white }}>

          {/* Panel header */}
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, background: '#FAFBFF',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: C.brand, fontFamily: "'DM Sans', sans-serif" }}>
              Your Submission
            </Typography>
            {isPending && (
              <Chip label="Awaiting Review" size="small"
                icon={<HourglassEmptyIcon sx={{ fontSize: '14px !important', color: `${C.warn} !important` }} />}
                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: C.warnBg, color: C.warn, border: `1px solid #FCD34D` }} />
            )}
            {isGraded && (
              <Chip label="Graded" size="small"
                icon={<EmojiEventsIcon sx={{ fontSize: '14px !important', color: `${C.success} !important` }} />}
                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: C.successBg, color: C.success, border: `1px solid #6EE7B7` }} />
            )}
          </Box>

          <Box sx={{ p: 3 }}>

            {/* ── STATE 1: No submission yet ── */}
            {!submission && !resubmitMode && (
              <UploadForm />
            )}

            {/* ── STATE 2: Submitted, not graded ── */}
            {isPending && !resubmitMode && (
              <Box>
                {/* Submission info */}
                <Box sx={{
                  display: 'flex', gap: 2, alignItems: 'flex-start',
                  p: 2.5, borderRadius: '12px',
                  background: C.warnBg, border: `1px solid #FCD34D`, mb: 3,
                }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', background: '#FEF3C7', border: `1px solid #FCD34D`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HourglassEmptyIcon sx={{ color: C.warn, fontSize: 22 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: C.warn, fontFamily: "'DM Sans', sans-serif" }}>
                      Submitted — awaiting teacher review
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: C.warn, mt: 0.35, fontFamily: "'DM Sans', sans-serif", opacity: 0.85 }}>
                      Submitted on {fmtDateTime(submission.submittedAt)}
                    </Typography>
                  </Box>
                </Box>

                {/* File info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: '10px',
                  border: `1px solid ${C.border}`, background: C.bg, mb: 3 }}>
                  <InsertDriveFileIcon sx={{ color: C.brand, fontSize: 22, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: C.brand, fontFamily: "'DM Sans', sans-serif",
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {submission.originalname || submission.filename}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                      {submission.mimetype}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined"
                    href={`${BASE}/api/documents/${submission.filename}`} target="_blank" rel="noreferrer"
                    sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, borderColor: C.border, color: C.brand,
                      borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    View File
                  </Button>
                </Box>

                {/* Resubmit option */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 2, borderRadius: '10px', border: `1px dashed ${C.border}`, background: '#FAFBFF' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                    Need to make changes?
                  </Typography>
                  <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                    onClick={() => { setResubmitMode(true); setSelectedFile(null); setError(''); }}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', color: C.brand,
                      fontFamily: "'DM Sans', sans-serif", background: '#EEF3FF', borderRadius: '8px', px: 1.75,
                      '&:hover': { background: '#DBEAFE' } }}>
                    Resubmit
                  </Button>
                </Box>
              </Box>
            )}

            {/* ── STATE 3: Graded ── */}
            {isGraded && !resubmitMode && (
              <Box>
                {/* Score ring + info */}
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start', mb: 3 }}>

                  {/* Ring */}
                  <ScoreRing
                    percentage={submission.percentage}
                    marksObtained={submission.marksObtained}
                    totalMarks={submission.totalMarks ?? assignment.totalMarks}
                  />

                  {/* Details */}
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Box sx={{
                      p: 2.5, borderRadius: '12px',
                      background: C.successBg, border: `1px solid #6EE7B7`, mb: 2,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <EmojiEventsIcon sx={{ color: C.success, fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: C.success, fontFamily: "'DM Sans', sans-serif" }}>
                          Assignment graded
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.8rem', color: C.success, fontFamily: "'DM Sans', sans-serif", opacity: 0.85 }}>
                        Graded on {fmtDateTime(submission.gradedAt)}
                      </Typography>
                    </Box>

                    {/* Progress bar */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: C.muted, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Score
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: gradeColor(submission.percentage).text, fontFamily: "'DM Sans', sans-serif" }}>
                          {parseFloat(submission.percentage).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%',
                          width: `${Math.min(parseFloat(submission.percentage) || 0, 100)}%`,
                          background: gradeColor(submission.percentage).text,
                          borderRadius: 4,
                          transition: 'width 1s ease',
                        }} />
                      </Box>
                    </Box>

                    {/* Submitted file */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: '8px',
                      border: `1px solid ${C.border}`, background: C.bg }}>
                      <InsertDriveFileIcon sx={{ color: C.muted, fontSize: 16 }} />
                      <Typography sx={{ flex: 1, fontSize: '0.78rem', color: C.muted, fontFamily: "'DM Sans', sans-serif",
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {submission.originalname || submission.filename}
                      </Typography>
                      <Button size="small" href={`${BASE}/api/documents/${submission.filename}`} target="_blank" rel="noreferrer"
                        sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, color: C.brand, fontFamily: "'DM Sans', sans-serif", minWidth: 0, px: 1 }}>
                        View
                      </Button>
                    </Box>
                  </Box>
                </Box>

                {/* Resubmit (even after grading — teacher will re-grade) */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 2, borderRadius: '10px', border: `1px dashed ${C.border}`, background: '#FAFBFF' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.82rem', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                      Want to improve your work?
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: C.border, fontFamily: "'DM Sans', sans-serif", mt: 0.25 }}>
                      Resubmitting will require your teacher to re-grade.
                    </Typography>
                  </Box>
                  <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                    onClick={() => { setResubmitMode(true); setSelectedFile(null); setError(''); }}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', color: C.brand,
                      fontFamily: "'DM Sans', sans-serif", background: '#EEF3FF', borderRadius: '8px', px: 1.75, whiteSpace: 'nowrap',
                      '&:hover': { background: '#DBEAFE' } }}>
                    Resubmit
                  </Button>
                </Box>
              </Box>
            )}

            {/* ── Resubmit mode (replaces previous, then refreshes) ── */}
            {resubmitMode && (
              <Box>
                {/* Warning banner */}
                <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: '10px',
                  background: C.warnBg, border: `1px solid #FCD34D`, mb: 3 }}>
                  <WarningAmberIcon sx={{ color: C.warn, fontSize: 18, mt: 0.1, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: C.warn, fontFamily: "'DM Sans', sans-serif" }}>
                      Resubmitting your work
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: C.warn, mt: 0.25, fontFamily: "'DM Sans', sans-serif", opacity: 0.9 }}>
                      {isGraded
                        ? 'Your current grade will be cleared and your teacher will need to re-grade your new submission.'
                        : 'Your previous submission will be replaced with this new file.'}
                    </Typography>
                  </Box>
                </Box>

                {/* Clear old submission first, then new upload form appears */}
                {submission ? (
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button variant="outlined" onClick={handleClearAndResubmit}
                      disabled={deleteLoading}
                      startIcon={deleteLoading ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', fontWeight: 700, borderColor: C.warn, color: C.warn,
                        borderRadius: '10px', px: 3, fontFamily: "'DM Sans', sans-serif",
                        '&:hover': { background: C.warnBg } }}>
                      {deleteLoading ? 'Clearing…' : 'Confirm — Clear Old Submission & Upload New'}
                    </Button>
                  </Box>
                ) : (
                  <UploadForm />
                )}

                {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}

                {!submission && (
                  <Button onClick={() => { setResubmitMode(false); setSelectedFile(null); setError(''); }}
                    sx={{ mt: 1, textTransform: 'none', color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                    ← Cancel
                  </Button>
                )}
              </Box>
            )}

          </Box>
        </Paper>

      </Box>
    </Box>
  );
}



