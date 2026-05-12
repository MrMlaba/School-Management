// routes/chatRoutes.js
// ─────────────────────────────────────────────────────────────
//  Add to server.js:
//    const chatRoutes = require('./routes/chatRoutes');
//    app.use('/api/student', requireStudent, chatRoutes);
// ─────────────────────────────────────────────────────────────

const express = require('express');
const pool    = require('../db');
const router  = express.Router();

/* ── Helper: get student info from DB ── */
async function getStudentInfo(studentId) {
  const { rows } = await pool.query(
    `SELECT first_name, last_name, grade, school_id FROM enrolled_students WHERE id = $1`,
    [studentId]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    name:     `${r.first_name} ${r.last_name}`.trim(),
    grade:    parseInt((r.grade || '').replace(/[^0-9]/g, '')) || 0,
    schoolId: r.school_id,
  };
}

// ── GET /api/student/chat/:grade ─────────────────────────────
// Returns last 200 messages with reactions + my reactions
router.get('/chat/:grade', async (req, res) => {
  const studentId = req.student.id;
  const numGrade  = parseInt(req.params.grade) || 0;

  try {
    const info = await getStudentInfo(studentId);
    if (!info)               return res.status(404).json({ message: 'Student not found' });
    if (info.grade !== numGrade) return res.status(403).json({ message: 'Not your grade chat' });

    const { rows } = await pool.query(`
      SELECT
        cm.id,
        cm.sender_id        AS "senderId",
        cm.sender_name      AS "senderName",
        cm.sender_type      AS "senderType",
        cm.message,
        cm.created_at       AS "createdAt",
        cm.reply_to_id      AS "replyToId",
        cm.reply_to_sender  AS "replyToSender",
        cm.reply_to_preview AS "replyToPreview",

        -- Aggregated reactions: { "👍": 3, "❤️": 1 }
        COALESCE(
          (SELECT json_object_agg(emoji, cnt)
           FROM (
             SELECT emoji, COUNT(*)::int AS cnt
             FROM chat_reactions WHERE message_id = cm.id
             GROUP BY emoji
           ) r
          ), '{}'::json
        ) AS reactions,

        -- This student's reactions: ["👍", "😂"]
        COALESCE(
          (SELECT array_agg(emoji)
           FROM chat_reactions
           WHERE message_id = cm.id AND student_id = $3
          ), ARRAY[]::text[]
        ) AS "myReactions"

      FROM chat_messages cm
      WHERE cm.school_id = $1 AND cm.grade = $2
      ORDER BY cm.created_at ASC
      LIMIT 200
    `, [info.schoolId, numGrade, studentId]);

    res.json(rows);
  } catch (err) {
    console.error('[chat GET]', err);
    res.status(500).json({ message: 'Failed to load messages: ' + err.message });
  }
});

// ── POST /api/student/chat/:grade ────────────────────────────
// Send a message (optionally replying to another)
router.post('/chat/:grade', async (req, res) => {
  const studentId             = req.student.id;
  const numGrade              = parseInt(req.params.grade) || 0;
  const { message, replyToId } = req.body;

  if (!message?.trim())    return res.status(400).json({ message: 'Message cannot be empty' });
  if (message.length > 1000) return res.status(400).json({ message: 'Message too long (max 1000 chars)' });

  try {
    const info = await getStudentInfo(studentId);
    if (!info)               return res.status(404).json({ message: 'Student not found' });
    if (info.grade !== numGrade) return res.status(403).json({ message: 'Not your grade' });

    // If replying, fetch the original message's preview
    let replyToSender = null, replyToPreview = null;
    if (replyToId) {
      const { rows: orig } = await pool.query(
        'SELECT sender_name, message FROM chat_messages WHERE id = $1',
        [replyToId]
      );
      if (orig.length) {
        replyToSender  = orig[0].sender_name;
        replyToPreview = orig[0].message.slice(0, 200);
      }
    }

    const { rows } = await pool.query(`
      INSERT INTO chat_messages
        (school_id, grade, sender_id, sender_name, sender_type,
         message, reply_to_id, reply_to_sender, reply_to_preview)
      VALUES ($1,$2,$3,$4,'student',$5,$6,$7,$8)
      RETURNING
        id,
        sender_id        AS "senderId",
        sender_name      AS "senderName",
        sender_type      AS "senderType",
        message,
        created_at       AS "createdAt",
        reply_to_id      AS "replyToId",
        reply_to_sender  AS "replyToSender",
        reply_to_preview AS "replyToPreview"
    `, [info.schoolId, numGrade, studentId, info.name,
        message.trim(), replyToId || null, replyToSender, replyToPreview]);

    res.status(201).json({ ...rows[0], reactions: {}, myReactions: [] });
  } catch (err) {
    console.error('[chat POST]', err);
    res.status(500).json({ message: 'Failed to send message: ' + err.message });
  }
});

// ── POST /api/student/chat/:grade/react ──────────────────────
// Toggle a reaction — click once to add, click again to remove
router.post('/chat/:grade/react', async (req, res) => {
  const studentId          = req.student.id;
  const { messageId, emoji } = req.body;

  if (!messageId || !emoji) return res.status(400).json({ message: 'messageId and emoji required' });

  try {
    // Check if this student already reacted with this emoji
    const { rows: existing } = await pool.query(
      'SELECT 1 FROM chat_reactions WHERE message_id=$1 AND student_id=$2 AND emoji=$3',
      [messageId, studentId, emoji]
    );

    if (existing.length) {
      // Already reacted — remove (toggle off)
      await pool.query(
        'DELETE FROM chat_reactions WHERE message_id=$1 AND student_id=$2 AND emoji=$3',
        [messageId, studentId, emoji]
      );
    } else {
      // Not yet reacted — add
      await pool.query(
        'INSERT INTO chat_reactions (message_id, student_id, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [messageId, studentId, emoji]
      );
    }

    // Return fresh reaction counts + this student's reactions
    const [rxRes, myRes] = await Promise.all([
      pool.query(
        'SELECT emoji, COUNT(*)::int AS count FROM chat_reactions WHERE message_id=$1 GROUP BY emoji',
        [messageId]
      ),
      pool.query(
        'SELECT emoji FROM chat_reactions WHERE message_id=$1 AND student_id=$2',
        [messageId, studentId]
      ),
    ]);

    const reactions  = {};
    rxRes.rows.forEach(r => { reactions[r.emoji] = r.count; });
    const myReactions = myRes.rows.map(r => r.emoji);

    res.json({ reactions, myReactions });
  } catch (err) {
    console.error('[chat react]', err);
    res.status(500).json({ message: 'Failed to react: ' + err.message });
  }
});

module.exports = router;