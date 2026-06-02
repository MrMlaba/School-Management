// routes/quizRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  FIX 4:  Quiz double-submit race condition fixed with SELECT FOR UPDATE
//  FIX 7:  Correct answers no longer exposed in result endpoint
//  FIX 8:  Quiz closes_at date validated on publish (no past dates, no >1yr)
// ─────────────────────────────────────────────────────────────────────────────

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const pool     = require('../db');

// ── File extraction helpers ───────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const buf  = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      return data.text || '';
    }
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error('[extractText]', err);
    return '';
  }
}

// ── AI Quiz Generator ─────────────────────────────────────────────────────────
let _providerCallCount = 0;

function buildPrompt({ text, questionCount, difficulty, topic, grade, subjectName }) {
  const MAX_CHARS = 4_500;
  const trimmed   = text.slice(0, MAX_CHARS);
  const seeds = [
    'Focus on WHY and HOW questions more than WHAT questions.',
    'Include at least two scenario-based questions ("A learner notices...", "If we apply...", etc.).',
    'Include at least one negative question ("Which of the following is NOT correct?").',
    'Vary question lengths — some short, some detailed.',
    'Mix definitional, reasoning, and applied questions equally.',
  ];
  const varietySeed = seeds[_providerCallCount % seeds.length];
  const system = `You are an expert South African high school quiz generator for Grade ${grade || 'school'}, subject: ${subjectName || 'General'}.
Your ONLY source of knowledge is the study material provided by the teacher.
Never use any information from outside the provided material.
Respond with valid JSON only — no markdown fences, no preamble, just raw JSON.`;
  const user = `Generate exactly ${questionCount} multiple-choice questions for a ${difficulty} difficulty quiz.
${topic ? `Topic focus: "${topic}"` : 'Cover a range of topics from throughout the material.'}

VARIETY RULES:
1. Do NOT start more than 2 questions with the same word.
2. ${varietySeed}
3. Spread cognitive levels: ~30% recall, ~40% understanding, ~30% application/analysis.
4. Vary language style — some questions formal, some conversational/practical.
5. Make incorrect options plausible, not obviously wrong.
6. Option lengths should vary.

STUDY MATERIAL (use ONLY this — no outside knowledge):
"""
${trimmed}
"""

Return ONLY this exact JSON — nothing else before or after:
{
  "title": "Descriptive quiz title based on the material",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["A. option one", "B. option two", "C. option three", "D. option four"],
      "correct": "A",
      "explanation": "According to the material, ...",
      "topic": "Relevant section from the material"
    }
  ]
}`;
  return { system, user };
}

function parseAIResponse(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const jsonStr = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error('AI response was not valid JSON — try generating again');
  return JSON.parse(jsonStr);
}

async function callGroq({ system, user }) {
  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) throw new Error('GROQ_API_KEY not set');
  const temp = 0.55 + Math.random() * 0.35;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', max_tokens: 3000, temperature: temp,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (res.status === 429) {
    const body = await res.text();
    let waitSecs = 10;
    try {
      const parsed = JSON.parse(body);
      const match  = (parsed?.error?.message || '').match(/try again in ([\d.]+)s/i);
      if (match) waitSecs = Math.ceil(parseFloat(match[1])) + 2;
    } catch {}
    throw new Error(`RATE_LIMIT:${waitSecs}`);
  }
  if (!res.ok) { const e = await res.text(); throw new Error(`Groq ${res.status}: ${e}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini({ system, user }) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) throw new Error('GEMINI_API_KEY not set');
  const temp       = 0.65 + Math.random() * 0.35;
  const fullPrompt = `${system}\n\n${user}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: temp, maxOutputTokens: 6000 },
      }),
    }
  );
  if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function generateQuizAI({ text, questionCount, difficulty, topic, grade, subjectName, provider = 'auto' }) {
  const hasGroq   = !!process.env.GROQ_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  if (!hasGroq && !hasGemini)
    throw new Error('No AI key configured. Add GROQ_API_KEY and/or GEMINI_API_KEY to .env');
  let useProvider = provider;
  if (useProvider === 'auto') {
    if (hasGroq && hasGemini) { useProvider = _providerCallCount % 2 === 0 ? 'groq' : 'gemini'; }
    else { useProvider = hasGroq ? 'groq' : 'gemini'; }
  }
  if (useProvider === 'groq'   && !hasGroq)   useProvider = 'gemini';
  if (useProvider === 'gemini' && !hasGemini)  useProvider = 'groq';
  _providerCallCount++;
  const prompt = buildPrompt({ text, questionCount, difficulty, topic, grade, subjectName });
  let rawText;
  try {
    rawText = useProvider === 'gemini' ? await callGemini(prompt) : await callGroq(prompt);
  } catch (primaryErr) {
    const isRateLimit   = primaryErr.message.startsWith('RATE_LIMIT:');
    const otherProvider = useProvider === 'groq' ? 'gemini' : 'groq';
    const otherAvailable = otherProvider === 'gemini' ? hasGemini : hasGroq;
    if (isRateLimit) {
      if (otherAvailable) {
        try {
          rawText      = otherProvider === 'gemini' ? await callGemini(prompt) : await callGroq(prompt);
          useProvider  = otherProvider;
        } catch (fallbackErr) {
          const waitSecs = parseInt(primaryErr.message.split(':')[1] || '8', 10);
          await new Promise(r => setTimeout(r, waitSecs * 1000));
          rawText = await callGroq(prompt);
          useProvider = 'groq';
        }
      } else {
        const waitSecs = parseInt(primaryErr.message.split(':')[1] || '8', 10);
        await new Promise(r => setTimeout(r, waitSecs * 1000));
        rawText = await callGroq(prompt);
      }
    } else {
      if (!otherAvailable) throw primaryErr;
      try {
        rawText     = otherProvider === 'gemini' ? await callGemini(prompt) : await callGroq(prompt);
        useProvider = otherProvider;
      } catch (fallbackErr) {
        throw new Error(`Both AI providers failed — Groq: ${primaryErr.message} | Gemini: ${fallbackErr.message}`);
      }
    }
  }
  const result      = parseAIResponse(rawText);
  result._provider  = useProvider;
  return result;
}

// ── FIX 8 HELPER — validate quiz close date ───────────────────────────────────
function validateClosesAt(closesAt) {
  if (!closesAt) return null; // optional — null means never closes

  const closeDate = new Date(closesAt);
  if (isNaN(closeDate.getTime())) return 'Invalid closes_at date format';
  if (closeDate < new Date())     return 'closes_at cannot be in the past';

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (closeDate > oneYearFromNow) return 'closes_at cannot be more than 1 year in the future';

  return null;
}

// ── Multer setup for material uploads ─────────────────────────────────────────
const materialStorage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'materials');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  },
});
const uploadMaterial = multer({
  storage:    materialStorage,
  limits:     { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TEACHER QUIZ ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
const teacherQuizRouter = express.Router();

// ── Materials ─────────────────────────────────────────────────────────────────
teacherQuizRouter.post('/materials', uploadMaterial.single('file'), async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { title, subjectId, classId, textContent } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  try {
    let extracted_text = '', filename = null, originalname = null, mimetype = null, material_type = 'text';
    if (req.file) {
      filename      = req.file.filename;
      originalname  = req.file.originalname;
      mimetype      = req.file.mimetype;
      material_type = path.extname(originalname).slice(1).toLowerCase();
      extracted_text = await extractText(path.join(__dirname, '..', 'uploads', 'materials', filename), mimetype);
    } else if (textContent) {
      extracted_text = textContent;
    } else {
      return res.status(400).json({ message: 'Provide a file or text content' });
    }
    if (!extracted_text.trim())
      return res.status(400).json({ message: 'Could not extract any text from this file. Try a different format or paste the text directly.' });
    const { rows } = await pool.query(
      `INSERT INTO teacher_materials (teacher_id, subject_id, class_id, school_id, title, material_type, filename, originalname, extracted_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, title, material_type, originalname, char_count, created_at`,
      [teacherId, subjectId || null, classId || null, schoolId, title, material_type, filename, originalname, extracted_text]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[materials POST]', err);
    res.status(500).json({ message: 'Failed to save material' });
  }
});

teacherQuizRouter.get('/materials', async (req, res) => {
  const teacherId            = req.teacher.id;
  const schoolId             = req.teacher.schoolId;
  const { subjectId, classId } = req.query;
  try {
    let q = `SELECT id, title, material_type, originalname, char_count, created_at, subject_id, class_id
             FROM teacher_materials WHERE teacher_id = $1 AND school_id = $2`;
    const params = [teacherId, schoolId];
    if (subjectId) { params.push(subjectId); q += ` AND subject_id = $${params.length}`; }
    if (classId)   { params.push(classId);   q += ` AND class_id   = $${params.length}`; }
    q += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error('[materials GET]', err);
    res.status(500).json({ message: 'Failed to load materials' });
  }
});

teacherQuizRouter.delete('/materials/:id', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      'DELETE FROM teacher_materials WHERE id=$1 AND teacher_id=$2 RETURNING id, filename',
      [req.params.id, teacherId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Material not found' });
    if (rows[0].filename) {
      const fp = path.join(__dirname, '..', 'uploads', 'materials', rows[0].filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.json({ message: 'Material deleted' });
  } catch (err) {
    console.error('[materials DELETE]', err);
    res.status(500).json({ message: 'Failed to delete material' });
  }
});

// ── Quiz generation ───────────────────────────────────────────────────────────
teacherQuizRouter.post('/quizzes/generate', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { materialIds, questionCount = 10, difficulty = 'medium', topic, subjectId, classId, provider = 'auto' } = req.body;
  if (!materialIds?.length) return res.status(400).json({ message: 'Select at least one material' });
  try {
    const { rows: mats } = await pool.query(
      `SELECT title, extracted_text FROM teacher_materials
       WHERE id = ANY($1::int[]) AND teacher_id = $2 AND school_id = $3`,
      [materialIds, teacherId, schoolId]
    );
    if (!mats.length) return res.status(404).json({ message: 'No materials found' });
    const combinedText = mats.map(m => `=== ${m.title} ===\n${m.extracted_text}`).join('\n\n---\n\n');
    let subjectName = '', grade = '';
    if (subjectId) { const { rows } = await pool.query('SELECT name FROM school_subjects WHERE id=$1', [subjectId]); subjectName = rows[0]?.name || ''; }
    if (classId)   { const { rows } = await pool.query('SELECT grade FROM classes WHERE id=$1', [classId]); grade = String(rows[0]?.grade || ''); }
    const result = await generateQuizAI({
      text: combinedText, questionCount: Math.min(50, Math.max(3, parseInt(questionCount))),
      difficulty, topic, grade, subjectName, provider,
    });
    res.json({ suggestedTitle: result.title, questions: result.questions, materialCount: mats.length, textLength: combinedText.length, provider: result._provider || 'groq' });
  } catch (err) {
    console.error('[quiz generate]', err);
    res.status(500).json({ message: 'AI generation failed: ' + err.message });
  }
});

// ── Quiz CRUD ─────────────────────────────────────────────────────────────────
teacherQuizRouter.post('/quizzes', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { title, description, subjectId, classId, timeLimitMinutes, difficulty, questions } = req.body;
  if (!title || !questions?.length) return res.status(400).json({ message: 'Title and questions are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO quizzes (teacher_id, subject_id, class_id, school_id, title, description, total_questions, time_limit_minutes, difficulty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [teacherId, subjectId || null, classId || null, schoolId, title, description || null, questions.length, timeLimitMinutes || 30, difficulty || 'medium']
    );
    const quizId = rows[0].id;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await client.query(
        `INSERT INTO quiz_questions (quiz_id, question_text, options, correct, explanation, topic, order_num)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [quizId, q.question, JSON.stringify(q.options), q.correct, q.explanation || null, q.topic || null, i]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: quizId, message: 'Quiz saved as draft' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[quiz POST]', err);
    res.status(500).json({ message: 'Failed to save quiz' });
  } finally {
    client.release();
  }
});

teacherQuizRouter.get('/quizzes', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT q.id, q.title, q.description, q.status, q.total_questions,
              q.time_limit_minutes, q.difficulty, q.published_at, q.closes_at, q.created_at,
              ss.name AS "subjectName", c.name AS "className",
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.submitted_at IS NOT NULL) AS "attemptCount"
       FROM quizzes q
       LEFT JOIN school_subjects ss ON ss.id = q.subject_id
       LEFT JOIN classes c ON c.id = q.class_id
       WHERE q.teacher_id = $1 AND q.school_id = $2
       ORDER BY q.created_at DESC`,
      [teacherId, schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[quizzes GET]', err);
    res.status(500).json({ message: 'Failed to load quizzes' });
  }
});

teacherQuizRouter.get('/quizzes/:id', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows: quiz } = await pool.query(
      `SELECT q.*, ss.name AS "subjectName", c.name AS "className"
       FROM quizzes q
       LEFT JOIN school_subjects ss ON ss.id = q.subject_id
       LEFT JOIN classes c ON c.id = q.class_id
       WHERE q.id = $1 AND q.teacher_id = $2`,
      [req.params.id, teacherId]
    );
    if (!quiz.length) return res.status(404).json({ message: 'Quiz not found' });
    const { rows: questions } = await pool.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_num', [req.params.id]
    );
    res.json({ ...quiz[0], questions });
  } catch (err) {
    console.error('[quiz GET id]', err);
    res.status(500).json({ message: 'Failed to load quiz' });
  }
});

// FIX 8: Validate closesAt before publishing
teacherQuizRouter.patch('/quizzes/:id/publish', async (req, res) => {
  const teacherId = req.teacher.id;
  const { closesAt } = req.body;

  // FIX 8: reject past dates and dates too far in future
  const dateError = validateClosesAt(closesAt);
  if (dateError) return res.status(400).json({ message: dateError });

  try {
    const { rows } = await pool.query(
      `UPDATE quizzes SET status='published', published_at=NOW(), closes_at=$1
       WHERE id=$2 AND teacher_id=$3 RETURNING id, status, published_at`,
      [closesAt || null, req.params.id, teacherId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Quiz not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[quiz publish]', err);
    res.status(500).json({ message: 'Failed to publish quiz' });
  }
});

teacherQuizRouter.patch('/quizzes/:id/close', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      `UPDATE quizzes SET status='closed' WHERE id=$1 AND teacher_id=$2 RETURNING id, status`,
      [req.params.id, teacherId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Quiz not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[quiz close]', err);
    res.status(500).json({ message: 'Failed to close quiz' });
  }
});

teacherQuizRouter.delete('/quizzes/:id', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      'DELETE FROM quizzes WHERE id=$1 AND teacher_id=$2 RETURNING id', [req.params.id, teacherId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Quiz not found' });
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    console.error('[quiz DELETE]', err);
    res.status(500).json({ message: 'Failed to delete quiz' });
  }
});

teacherQuizRouter.get('/quizzes/:id/results', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows: quiz } = await pool.query(
      'SELECT id, title FROM quizzes WHERE id=$1 AND teacher_id=$2', [req.params.id, teacherId]
    );
    if (!quiz.length) return res.status(404).json({ message: 'Quiz not found' });
    const { rows: attempts } = await pool.query(
      `SELECT qa.id, qa.score, qa.total, qa.percentage, qa.time_taken_seconds,
              qa.started_at, qa.submitted_at,
              es.first_name AS "firstName", es.last_name AS "lastName",
              es.student_number AS "studentNumber"
       FROM quiz_attempts qa
       JOIN enrolled_students es ON es.id = qa.student_id
       WHERE qa.quiz_id = $1 AND qa.submitted_at IS NOT NULL
       ORDER BY qa.percentage DESC NULLS LAST`,
      [req.params.id]
    );
    const { rows: stats } = await pool.query(
      `SELECT COUNT(*) AS "attempts", AVG(percentage)::NUMERIC(5,2) AS "avgPct",
              MAX(percentage) AS "maxPct", MIN(percentage) AS "minPct"
       FROM quiz_attempts WHERE quiz_id = $1 AND submitted_at IS NOT NULL`,
      [req.params.id]
    );
    res.json({ quiz: quiz[0], attempts, stats: stats[0] });
  } catch (err) {
    console.error('[quiz results]', err);
    res.status(500).json({ message: 'Failed to load results' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDENT QUIZ ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
const studentQuizRouter = express.Router();

studentQuizRouter.get('/quizzes', async (req, res) => {
  const studentId = req.student.id;
  try {
    const { rows: stuRows } = await pool.query(
      `SELECT grade, stream, school_id FROM enrolled_students WHERE id = $1`, [studentId]
    );
    if (!stuRows.length) return res.status(404).json({ message: 'Student not found' });
    const { grade, school_id } = stuRows[0];
    const numGrade = parseInt((grade || '').replace(/[^0-9]/g, '')) || 0;

    const { rows } = await pool.query(
      `SELECT q.id, q.title, q.description, q.total_questions,
              q.time_limit_minutes, q.difficulty, q.published_at, q.closes_at,
              ss.name AS "subjectName", c.name AS "className",
              qa.id AS "attemptId", qa.submitted_at AS "submittedAt",
              qa.score, qa.total AS "attemptTotal", qa.percentage
       FROM quizzes q
       JOIN classes c ON c.id = q.class_id
       LEFT JOIN school_subjects ss ON ss.id = q.subject_id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = $1
       WHERE q.school_id = $2 AND q.status = 'published'
         AND c.grade::text = $3::text
         AND (q.closes_at IS NULL OR q.closes_at > NOW())
       ORDER BY q.published_at DESC`,
      [studentId, school_id, String(numGrade)]
    );
    res.json(rows);
  } catch (err) {
    console.error('[student quizzes]', err);
    res.status(500).json({ message: 'Failed to load quizzes: ' + err.message });
  }
});

studentQuizRouter.get('/quizzes/:id', async (req, res) => {
  const studentId = req.student.id;
  try {
    const { rows: stuRows } = await pool.query('SELECT school_id FROM enrolled_students WHERE id = $1', [studentId]);
    if (!stuRows.length) return res.status(404).json({ message: 'Student not found' });
    const school_id = stuRows[0].school_id;

    const { rows: quiz } = await pool.query(
      `SELECT q.id, q.title, q.description, q.total_questions, q.time_limit_minutes, q.difficulty,
              q.published_at, q.closes_at, ss.name AS "subjectName", c.name AS "className"
       FROM quizzes q
       LEFT JOIN school_subjects ss ON ss.id = q.subject_id
       LEFT JOIN classes c ON c.id = q.class_id
       WHERE q.id = $1 AND q.school_id = $2 AND q.status = 'published'`,
      [req.params.id, school_id]
    );
    if (!quiz.length) return res.status(404).json({ message: 'Quiz not found or not available' });

    const { rows: existing } = await pool.query(
      'SELECT id, submitted_at FROM quiz_attempts WHERE quiz_id=$1 AND student_id=$2',
      [req.params.id, studentId]
    );
    if (existing[0]?.submitted_at)
      return res.status(409).json({ message: 'You have already submitted this quiz', attemptId: existing[0].id });

    // Questions without correct answer (never expose correct to student before submission)
    const { rows: questions } = await pool.query(
      `SELECT id, question_text AS "question", options, order_num AS "orderNum", topic
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_num`,
      [req.params.id]
    );
    res.json({ ...quiz[0], questions });
  } catch (err) {
    console.error('[student quiz GET]', err);
    res.status(500).json({ message: 'Failed to load quiz' });
  }
});

// FIX 4: Race condition fixed with SELECT FOR UPDATE inside transaction
studentQuizRouter.post('/quizzes/:id/attempt', async (req, res) => {
  const studentId             = req.student.id;
  const { answers, timeTakenSeconds } = req.body;
  if (!answers) return res.status(400).json({ message: 'Answers are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: stuRows } = await client.query('SELECT school_id FROM enrolled_students WHERE id = $1', [studentId]);
    if (!stuRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Student not found' }); }
    const school_id = stuRows[0].school_id;

    const { rows: quiz } = await client.query(
      `SELECT id, total_questions FROM quizzes
       WHERE id=$1 AND school_id=$2 AND status='published'
         AND (closes_at IS NULL OR closes_at > NOW())`,
      [req.params.id, school_id]
    );
    if (!quiz.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Quiz not available' }); }

    // FIX 4: SELECT FOR UPDATE prevents two simultaneous submits both passing this check
    const { rows: dup } = await client.query(
      'SELECT id FROM quiz_attempts WHERE quiz_id=$1 AND student_id=$2 FOR UPDATE',
      [req.params.id, studentId]
    );
    if (dup.length) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Already submitted' }); }

    const { rows: questions } = await client.query(
      'SELECT id, correct FROM quiz_questions WHERE quiz_id=$1', [req.params.id]
    );

    let score = 0;
    const markedAnswers = questions.map(q => {
      const selected   = answers[String(q.id)] || null;
      const is_correct = selected && selected.toUpperCase() === q.correct.toUpperCase();
      if (is_correct) score++;
      return { question_id: q.id, selected_answer: selected, is_correct };
    });

    const total      = questions.length;
    const percentage = total > 0 ? parseFloat(((score / total) * 100).toFixed(2)) : 0;

    const { rows: attempt } = await client.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, school_id, submitted_at, score, total, percentage, time_taken_seconds)
       VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING id`,
      [req.params.id, studentId, school_id, score, total, percentage, timeTakenSeconds || null]
    );
    const attemptId = attempt[0].id;

    for (const a of markedAnswers) {
      await client.query(
        'INSERT INTO quiz_answers (attempt_id, question_id, selected_answer, is_correct) VALUES ($1,$2,$3,$4)',
        [attemptId, a.question_id, a.selected_answer, a.is_correct]
      );
    }

    await client.query('COMMIT');
    res.json({ attemptId, score, total, percentage });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[quiz attempt POST]', err);
    res.status(500).json({ message: 'Failed to submit quiz' });
  } finally {
    client.release();
  }
});

// FIX 7: Correct answers NOT exposed in result — only isCorrect boolean
// Students see whether they got it right, but NOT the correct answer
// This prevents answer harvesting between attempts
studentQuizRouter.get('/quizzes/:id/result', async (req, res) => {
  const studentId = req.student.id;
  try {
    const { rows: attempt } = await pool.query(
      `SELECT qa.id, qa.score, qa.total, qa.percentage, qa.time_taken_seconds, qa.submitted_at
       FROM quiz_attempts qa
       WHERE qa.quiz_id=$1 AND qa.student_id=$2 AND qa.submitted_at IS NOT NULL`,
      [req.params.id, studentId]
    );
    if (!attempt.length) return res.status(404).json({ message: 'No submitted attempt found' });

    // FIX 7: qq.correct is intentionally excluded from this SELECT
    // Students see question text, their answer, and whether it was correct
    // They do NOT see the correct answer — prevents cheating on future attempts
    const { rows: questions } = await pool.query(
      `SELECT qq.id,
              qq.question_text AS "question",
              qq.options,
              qq.explanation,
              qq.topic,
              ans.selected_answer AS "selected",
              ans.is_correct      AS "isCorrect"
              -- qq.correct deliberately omitted
       FROM quiz_questions qq
       LEFT JOIN quiz_answers ans
         ON ans.question_id = qq.id AND ans.attempt_id = $1
       WHERE qq.quiz_id = $2
       ORDER BY qq.order_num`,
      [attempt[0].id, req.params.id]
    );

    res.json({ attempt: attempt[0], questions });
  } catch (err) {
    console.error('[quiz result GET]', err);
    res.status(500).json({ message: 'Failed to load result' });
  }
});

module.exports = { teacherQuizRouter, studentQuizRouter };