// StudentQuizAttempt.js
// Route in App.js:
//   import StudentQuizAttempt from './StudentQuizAttempt';
//   <Route path="/student/quiz/:id" element={<StudentQuizAttempt />} />
//
// Also create StudentQuizList.js or add quiz tab to student dashboard.
// Quickest integration: add a "Quizzes" quick link in StudentDashboard
// pointing to /student/quizzes, and create the list page from the
// GET /api/student/quizzes endpoint.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, LinearProgress, Tooltip } from '@mui/material';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import CancelIcon        from '@mui/icons-material/Cancel';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import MenuBookIcon      from '@mui/icons-material/MenuBook';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon   from '@mui/icons-material/EmojiEvents';
import LightbulbIcon     from '@mui/icons-material/Lightbulb';

const T = {
  navy:      '#0B1F3A',
  navyLight: '#1E3D6B',
  gold:      '#D4A843',
  goldLight: '#F0C96A',
  bg:        '#F0F3FB',
  white:     '#FFFFFF',
  border:    '#E1E8F4',
  muted:     '#7A8BA0',
  text:      '#1A2B3C',
  success:   '#1A8A5A',
  successBg: '#E6F7F0',
  warn:      '#B45309',
  warnBg:    '#FEF3C7',
  danger:    '#B91C1C',
  dangerBg:  '#FEE2E2',
  purple:    '#6D28D9',
  purpleBg:  '#EDE9FE',
};

const BASE    = '%REACT_APP_API_URL%';
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('studentToken')}` });
const jsonHdr = () => ({ 'Content-Type': 'application/json', ...authHdr() });

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/* ── Grade label ── */
const gradeInfo = (pct) => {
  if (pct >= 80) return { label: 'Outstanding!',  emoji: '🏆', color: T.success };
  if (pct >= 70) return { label: 'Great work!',   emoji: '🌟', color: '#0891B2' };
  if (pct >= 60) return { label: 'Good job!',     emoji: '👍', color: T.success };
  if (pct >= 50) return { label: 'Keep going!',   emoji: '💪', color: T.warn };
  return                 { label: 'Needs work',   emoji: '📚', color: T.danger };
};

/* ── Timer display ── */
const formatTime = (secs) => {
  if (secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function StudentQuizAttempt() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [phase,   setPhase]   = useState('loading'); // loading | intro | attempt | submitting | result | error | already_done
  const [quiz,    setQuiz]    = useState(null);
  const [answers, setAnswers] = useState({});         // { questionId: 'A' }
  const [result,  setResult]  = useState(null);
  const [current, setCurrent] = useState(0);          // current question index
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const timerRef = useRef(null);

  /* ── Load quiz ── */
  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    if (!token) { navigate('/student-login'); return; }

    (async () => {
      const res = await fetch(`${BASE}/api/student/quizzes/${id}`, { headers: authHdr() });

      if (res.status === 409) {
        // Already submitted — load result
        setPhase('loading');
        const rRes = await fetch(`${BASE}/api/student/quizzes/${id}/result`, { headers: authHdr() });
        if (rRes.ok) { setResult(await rRes.json()); setPhase('result'); }
        else setPhase('already_done');
        return;
      }

      if (!res.ok) { setPhase('error'); return; }

      const data = await res.json();
      setQuiz(data);
      setTimeLeft((data.timeLimitMinutes || data.time_limit_minutes || 30) * 60);
      setPhase('intro');
    })();
  }, [id, navigate]);

  /* ── Countdown timer (starts when attempt begins) ── */
  const handleSubmit = useCallback(async (auto = false) => {
    if (phase !== 'attempt') return;
    clearInterval(timerRef.current);
    setPhase('submitting');

    const timeTaken = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : null;

    const res = await fetch(`${BASE}/api/student/quizzes/${id}/attempt`, {
      method: 'POST', headers: jsonHdr(),
      body:   JSON.stringify({ answers, timeTakenSeconds: timeTaken }),
    });

    if (!res.ok) {
      const e = await res.json();
      if (e.message?.includes('Already')) {
        // Race condition — load result
        const rRes = await fetch(`${BASE}/api/student/quizzes/${id}/result`, { headers: authHdr() });
        if (rRes.ok) { setResult(await rRes.json()); setPhase('result'); }
        return;
      }
      setPhase('error');
      return;
    }

    // Fetch full result with explanations
    const rRes = await fetch(`${BASE}/api/student/quizzes/${id}/result`, { headers: authHdr() });
    if (rRes.ok) { setResult(await rRes.json()); setPhase('result'); }
    else setPhase('error');
  }, [phase, id, answers, startedAt]);

  useEffect(() => {
    if (phase === 'attempt') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, handleSubmit]);

  /* ── Start quiz ── */
  const startQuiz = () => {
    setStartedAt(Date.now());
    setCurrent(0);
    setPhase('attempt');
  };

  /* ── Answer a question ── */
  const selectAnswer = (letter) => {
    const qId = quiz.questions[current].id;
    setAnswers(a => ({ ...a, [String(qId)]: letter }));
  };

  const currentAnswer = quiz ? answers[String(quiz.questions?.[current]?.id)] : null;
  const answeredCount = quiz ? quiz.questions?.filter(q => answers[String(q.id)]).length : 0;
  const pctDone       = quiz?.questions?.length ? (answeredCount / quiz.questions.length) * 100 : 0;
  const isLowTime     = timeLeft > 0 && timeLeft < 60;

  /* ══════════════════════════════════
     PHASE: LOADING
  ══════════════════════════════════ */
  if (phase === 'loading') return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <CircularProgress sx={{ color: T.navy }} />
    </Box>
  );

  /* ══════════════════════════════════
     PHASE: ERROR
  ══════════════════════════════════ */
  if (phase === 'error') return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, gap: 2 }}>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: T.danger, fontFamily: "'DM Sans', sans-serif" }}>Quiz not available</Typography>
      <Button onClick={() => navigate(-1)} sx={{ textTransform: 'none', color: T.navyLight }}>← Go back</Button>
    </Box>
  );

  /* ══════════════════════════════════
     PHASE: ALREADY DONE (no result loaded)
  ══════════════════════════════════ */
  if (phase === 'already_done') return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, gap: 2 }}>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>You've already submitted this quiz.</Typography>
      <Button onClick={() => navigate(-1)} sx={{ textTransform: 'none', color: T.navyLight }}>← Go back</Button>
    </Box>
  );

  /* ══════════════════════════════════
     PHASE: INTRO
  ══════════════════════════════════ */
  if (phase === 'intro' && quiz) return (
    <Box sx={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=Lora:wght@600;700&display=swap');`}</style>

      {/* Nav */}
      <Box sx={{ background: T.navy, px: { xs: 2, md: 4 }, height: 56, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MenuBookIcon sx={{ color: T.navy, fontSize: 16 }} />
        </Box>
        <Typography sx={{ color: T.white, fontWeight: 700, fontSize: '0.9rem' }}>Student Portal</Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 4 }}>
        <Box sx={{ background: T.white, borderRadius: '20px', border: `1px solid ${T.border}`, p: { xs: 3, md: 4 }, maxWidth: 520, width: '100%', boxShadow: '0 4px 32px rgba(11,31,58,0.10)' }}>
          {/* Quiz header */}
          <Box sx={{ width: 60, height: 60, borderRadius: '16px', background: T.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
            <MenuBookIcon sx={{ color: T.purple, fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: T.text, fontFamily: "'Lora', serif", lineHeight: 1.2, mb: 0.75 }}>
            {quiz.title}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: T.muted, mb: 3 }}>
            {quiz.subjectName}{quiz.className ? ` · ${quiz.className}` : ''}
          </Typography>
          {quiz.description && (
            <Typography sx={{ fontSize: '0.88rem', color: T.text, lineHeight: 1.6, mb: 3, p: 1.5, borderRadius: '10px', background: T.bg, border: `1px solid ${T.border}` }}>
              {quiz.description}
            </Typography>
          )}

          {/* Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3.5 }}>
            {[
              { label: 'Questions',  value: quiz.total_questions || quiz.totalQuestions },
              { label: 'Time Limit', value: `${quiz.time_limit_minutes || quiz.timeLimitMinutes} min` },
              { label: 'Difficulty', value: (quiz.difficulty || 'medium').charAt(0).toUpperCase() + (quiz.difficulty || 'medium').slice(1) },
            ].map(s => (
              <Box key={s.label} sx={{ textAlign: 'center', p: 1.5, borderRadius: '10px', background: T.bg, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: T.navy, lineHeight: 1 }}>{s.value}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: T.muted, mt: 0.3 }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Rules */}
          <Box sx={{ mb: 3, p: 1.75, borderRadius: '10px', background: T.purpleBg, border: `1px solid ${T.purple}30` }}>
            <Typography sx={{ fontSize: '0.78rem', color: T.purple, fontWeight: 600, lineHeight: 1.6 }}>
              📌 Read each question carefully.<br />
              ⏱ The timer starts when you click Start.<br />
              ✅ You can change answers before submitting.<br />
              🔒 You can only attempt this quiz once.
            </Typography>
          </Box>

          <Button fullWidth variant="contained" onClick={startQuiz}
            sx={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`, color: T.white, fontWeight: 700, fontSize: '1rem', textTransform: 'none', borderRadius: '14px', py: 1.5, boxShadow: `0 4px 16px ${T.navy}40` }}>
            Start Quiz →
          </Button>
          <Button fullWidth onClick={() => navigate(-1)} sx={{ mt: 1, textTransform: 'none', color: T.muted, fontSize: '0.85rem' }}>
            ← Go back
          </Button>
        </Box>
      </Box>
    </Box>
  );

  /* ══════════════════════════════════
     PHASE: ATTEMPT
  ══════════════════════════════════ */
  if ((phase === 'attempt' || phase === 'submitting') && quiz) {
    const q = quiz.questions?.[current];
    if (!q) return null;

    return (
      <Box sx={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&display=swap');`}</style>

        {/* Top bar */}
        <Box sx={{ background: T.navy, px: { xs: 2, md: 4 }, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(11,31,58,0.2)' }}>
          <Typography sx={{ color: T.white, fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{quiz.title}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Typography sx={{ color: T.muted, fontSize: '0.78rem' }}>{answeredCount}/{quiz.questions.length} answered</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: '8px', background: isLowTime ? T.danger + '30' : 'rgba(255,255,255,0.12)', border: `1px solid ${isLowTime ? T.danger + '60' : 'transparent'}` }}>
              <AccessTimeIcon sx={{ color: isLowTime ? '#FCA5A5' : T.goldLight, fontSize: 16 }} />
              <Typography sx={{ color: isLowTime ? '#FCA5A5' : T.white, fontWeight: 800, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(timeLeft)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Progress */}
        <LinearProgress variant="determinate" value={pctDone} sx={{ height: 3, backgroundColor: T.border, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${T.gold}, ${T.goldLight})` } }} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', px: 2, py: 3 }}>
          <Box sx={{ width: '100%', maxWidth: 680 }}>

            {/* Question number pills */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2.5 }}>
              {quiz.questions.map((_, i) => {
                const answered = !!answers[String(quiz.questions[i].id)];
                const isCur    = i === current;
                return (
                  <Box key={i} onClick={() => setCurrent(i)} sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", background: isCur ? T.navy : answered ? T.navyLight + '28' : T.border, color: isCur ? T.white : answered ? T.navyLight : T.muted, border: `1.5px solid ${isCur ? T.navy : answered ? T.navyLight + '60' : T.border}`, transition: 'all 0.12s' }}>
                    {i + 1}
                  </Box>
                );
              })}
            </Box>

            {/* Question card */}
            <Box sx={{ background: T.white, borderRadius: '18px', border: `1px solid ${T.border}`, p: { xs: 2.5, md: 3.5 }, mb: 2, boxShadow: '0 2px 16px rgba(11,31,58,0.07)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ px: 1.25, py: 0.35, borderRadius: '8px', background: T.purpleBg }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.purple }}>Question {current + 1} of {quiz.questions.length}</Typography>
                </Box>
                {q.topic && <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>{q.topic}</Typography>}
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1rem', md: '1.1rem' }, color: T.text, lineHeight: 1.5, mb: 3, fontFamily: "'DM Sans', sans-serif" }}>
                {q.question}
              </Typography>

              {/* Options */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {(q.options || []).map((opt, oi) => {
                  const letter    = OPTION_LETTERS[oi];
                  const selected  = currentAnswer === letter;
                  return (
                    <Box key={oi} onClick={() => selectAnswer(letter)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '14px', border: `2px solid ${selected ? T.navy : T.border}`, background: selected ? T.navy + '08' : T.white, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: T.navyLight, background: '#EEF3FF' } }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: selected ? T.navy : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: selected ? T.white : T.muted }}>{letter}</Typography>
                      </Box>
                      <Typography sx={{ fontWeight: selected ? 700 : 400, fontSize: '0.9rem', color: selected ? T.navy : T.text, flex: 1, lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
                        {opt.replace(/^[A-D]\.\s*/i, '')}
                      </Typography>
                      {selected && <CheckCircleIcon sx={{ color: T.navy, fontSize: 18, flexShrink: 0 }} />}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button disabled={current === 0} onClick={() => setCurrent(c => c - 1)}
                sx={{ textTransform: 'none', color: T.muted, fontFamily: "'DM Sans', sans-serif", '&:disabled': { opacity: 0.3 } }}>
                ← Previous
              </Button>

              {current < quiz.questions.length - 1 ? (
                <Button variant="contained" onClick={() => setCurrent(c => c + 1)}
                  sx={{ background: T.navy, textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3, boxShadow: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                  Next →
                </Button>
              ) : (
                <Button variant="contained" onClick={() => handleSubmit(false)} disabled={phase === 'submitting'}
                  startIcon={phase === 'submitting' ? <CircularProgress size={16} sx={{ color: 'white' }} /> : null}
                  sx={{ background: `linear-gradient(135deg, ${T.success}, #16A34A)`, textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3, boxShadow: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem' }}>
                  {phase === 'submitting' ? 'Submitting…' : `Submit Quiz (${answeredCount}/${quiz.questions.length} answered)`}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  /* ══════════════════════════════════
     PHASE: RESULT
  ══════════════════════════════════ */
  if (phase === 'result' && result) {
    const pct     = parseFloat(result.attempt?.percentage) || 0;
    const gi      = gradeInfo(pct);
    const color   = pct >= 75 ? T.success : pct >= 50 ? T.warn : T.danger;
    const bg      = pct >= 75 ? T.successBg : pct >= 50 ? T.warnBg : T.dangerBg;

    return (
      <Box sx={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&family=Lora:wght@600;700&display=swap');`}</style>

        {/* Nav */}
        <Box sx={{ background: T.navy, px: { xs: 2, md: 4 }, height: 56, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MenuBookIcon sx={{ color: T.navy, fontSize: 16 }} />
          </Box>
          <Typography sx={{ color: T.white, fontWeight: 700, fontSize: '0.9rem' }}>Quiz Results</Typography>
        </Box>

        <Box sx={{ maxWidth: 680, mx: 'auto', px: 2, py: 3 }}>
          {/* Score banner */}
          <Box sx={{ background: T.white, borderRadius: '20px', border: `1px solid ${T.border}`, p: 3.5, mb: 3, textAlign: 'center', boxShadow: '0 4px 24px rgba(11,31,58,0.08)' }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 0.5 }}>{gi.emoji}</Typography>
            <Typography sx={{ fontWeight: 700, fontFamily: "'Lora', serif", fontSize: '1.8rem', color: T.text, mb: 0.5 }}>{gi.label}</Typography>

            <Box sx={{ display: 'inline-block', px: 3, py: 1.5, borderRadius: '16px', background: bg, mb: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '2.5rem', color, lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>{pct.toFixed(1)}%</Typography>
              <Typography sx={{ color, fontSize: '0.85rem', fontWeight: 600 }}>{result.attempt?.score} / {result.attempt?.total} correct</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
              <Box sx={{ p: 1.5, borderRadius: '10px', background: T.bg, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: T.navy }}>{result.attempt?.score}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>Correct answers</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '10px', background: T.bg, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: T.navy }}>
                  {result.attempt?.time_taken_seconds ? `${Math.floor(result.attempt.time_taken_seconds / 60)}m ${result.attempt.time_taken_seconds % 60}s` : '—'}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>Time taken</Typography>
              </Box>
            </Box>

            <Button onClick={() => navigate(-1)} variant="contained"
              sx={{ background: T.navy, textTransform: 'none', fontWeight: 700, borderRadius: '12px', px: 3, boxShadow: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              Back to Dashboard
            </Button>
          </Box>

          {/* Question review */}
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
            Question Review
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {result.questions?.map((q, idx) => {
              const correct  = q.isCorrect;
              const selected = q.selected;
              return (
                <Box key={q.id} sx={{ background: T.white, borderRadius: '14px', border: `1px solid ${T.border}`, borderLeft: `4px solid ${correct ? T.success : selected ? T.danger : T.muted}`, overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '7px', background: correct ? T.successBg : T.dangerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {correct
                            ? <CheckCircleIcon sx={{ fontSize: 14, color: T.success }} />
                            : <CancelIcon      sx={{ fontSize: 14, color: T.danger }} />
                          }
                        </Box>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>Q{idx + 1}</Typography>
                        {q.topic && <Typography sx={{ fontSize: '0.68rem', color: T.muted, bgcolor: T.bg, px: 0.75, py: 0.2, borderRadius: '5px' }}>{q.topic}</Typography>}
                      </Box>
                    </Box>

                    <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: T.text, lineHeight: 1.5, mb: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
                      {q.question}
                    </Typography>

                    {/* Options */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {(q.options || []).map((opt, oi) => {
                        const letter       = OPTION_LETTERS[oi];
                        const isCorrectOpt = q.correct === letter;
                        const isSelected   = selected === letter;
                        const showGreen    = isCorrectOpt;
                        const showRed      = isSelected && !isCorrectOpt;

                        return (
                          <Box key={oi} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '8px 12px', borderRadius: '10px', background: showGreen ? T.successBg : showRed ? T.dangerBg : T.bg, border: `1px solid ${showGreen ? '#A7F3D0' : showRed ? '#FCA5A5' : T.border}` }}>
                            <Box sx={{ width: 24, height: 24, borderRadius: '7px', background: showGreen ? T.success : showRed ? T.danger : T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', color: showGreen || showRed ? T.white : T.muted }}>{letter}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: showGreen ? 700 : 400, color: showGreen ? T.success : showRed ? T.danger : T.muted, flex: 1, fontFamily: "'DM Sans', sans-serif" }}>
                              {opt.replace(/^[A-D]\.\s*/i, '')}
                            </Typography>
                            {showGreen && <CheckCircleIcon sx={{ color: T.success, fontSize: 16 }} />}
                            {showRed && isSelected && <Typography sx={{ fontSize: '0.7rem', color: T.danger, fontWeight: 700 }}>Your answer</Typography>}
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Explanation */}
                    {q.explanation && (
                      <Box sx={{ mt: 1.5, p: 1.25, borderRadius: '8px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', gap: 0.75 }}>
                        <LightbulbIcon sx={{ fontSize: 16, color: T.warn, flexShrink: 0, mt: 0.1 }} />
                        <Typography sx={{ fontSize: '0.78rem', color: T.warn, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{q.explanation}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button onClick={() => navigate(-1)} sx={{ textTransform: 'none', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>
              ← Back to Dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return null;
}

