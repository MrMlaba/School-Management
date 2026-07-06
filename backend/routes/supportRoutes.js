const express = require('express');
const pool    = require('../db');

const schoolAdminTicketsRouter = express.Router();
const systemAdminTicketsRouter = express.Router();

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

// ── School admin: tickets for their own school ────────────────────────────────
schoolAdminTicketsRouter.get('/support-tickets', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.subject, t.priority, t.status,
              t.created_at AS "createdAt", t.updated_at AS "updatedAt",
              COUNT(r.id) AS "replyCount"
       FROM support_tickets t
       LEFT JOIN support_ticket_replies r ON r.ticket_id = t.id
       WHERE t.school_id = $1
       GROUP BY t.id
       ORDER BY t.updated_at DESC`,
      [req.admin.schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[school tickets list]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

schoolAdminTicketsRouter.post('/support-tickets', async (req, res) => {
  const { subject, description, priority } = req.body || {};
  if (!subject?.trim() || !description?.trim())
    return res.status(400).json({ message: 'Subject and description are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO support_tickets (school_id, created_by_admin_id, subject, description, priority)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, subject, priority, status, created_at AS "createdAt"`,
      [req.admin.schoolId, req.admin.id, subject.trim(), description.trim(),
       VALID_PRIORITIES.includes(priority) ? priority : 'normal']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[create ticket]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

schoolAdminTicketsRouter.get('/support-tickets/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, subject, description, priority, status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM support_tickets WHERE id = $1 AND school_id = $2`,
      [req.params.id, req.admin.schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Ticket not found' });
    const { rows: replies } = await pool.query(
      `SELECT id, author, author_role AS "authorRole", message, created_at AS "createdAt"
       FROM support_ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ ...rows[0], replies });
  } catch (err) {
    console.error('[ticket detail]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

schoolAdminTicketsRouter.post('/support-tickets/:id/reply', async (req, res) => {
  const { message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
  try {
    const { rows: tRows } = await pool.query(
      'SELECT id, status FROM support_tickets WHERE id = $1 AND school_id = $2',
      [req.params.id, req.admin.schoolId]
    );
    if (!tRows.length) return res.status(404).json({ message: 'Ticket not found' });

    await pool.query(
      `INSERT INTO support_ticket_replies (ticket_id, author, author_role, message)
       VALUES ($1,$2,'school_admin',$3)`,
      [req.params.id, req.admin.username, message.trim()]
    );
    // A reply from the school reopens a ticket the provider had considered done.
    const reopen = ['resolved', 'closed'].includes(tRows[0].status);
    await pool.query(
      `UPDATE support_tickets SET updated_at = NOW()${reopen ? ", status = 'open'" : ''} WHERE id = $1`,
      [req.params.id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[ticket reply]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── System admin: tickets across every school ─────────────────────────────────
systemAdminTicketsRouter.get('/support-tickets', async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let where = '';
    if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      where = `WHERE t.status = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT t.id, t.subject, t.priority, t.status,
              t.created_at AS "createdAt", t.updated_at AS "updatedAt",
              s.name AS school, COUNT(r.id) AS "replyCount"
       FROM support_tickets t
       JOIN schools s ON s.id = t.school_id
       LEFT JOIN support_ticket_replies r ON r.ticket_id = t.id
       ${where}
       GROUP BY t.id, s.name
       ORDER BY t.updated_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[system tickets list]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

systemAdminTicketsRouter.get('/support-tickets/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.subject, t.description, t.priority, t.status,
              t.created_at AS "createdAt", t.updated_at AS "updatedAt", s.name AS school
       FROM support_tickets t JOIN schools s ON s.id = t.school_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Ticket not found' });
    const { rows: replies } = await pool.query(
      `SELECT id, author, author_role AS "authorRole", message, created_at AS "createdAt"
       FROM support_ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ ...rows[0], replies });
  } catch (err) {
    console.error('[system ticket detail]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

systemAdminTicketsRouter.post('/support-tickets/:id/reply', async (req, res) => {
  const { message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
  try {
    const { rows: tRows } = await pool.query('SELECT id FROM support_tickets WHERE id = $1', [req.params.id]);
    if (!tRows.length) return res.status(404).json({ message: 'Ticket not found' });

    await pool.query(
      `INSERT INTO support_ticket_replies (ticket_id, author, author_role, message)
       VALUES ($1,$2,'system_admin',$3)`,
      [req.params.id, req.sysAdmin.username, message.trim()]
    );
    // First response from support moves a new ticket out of the raw "open" queue.
    await pool.query(
      `UPDATE support_tickets
       SET updated_at = NOW(), status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
       WHERE id = $1`,
      [req.params.id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[system ticket reply]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

systemAdminTicketsRouter.patch('/support-tickets/:id', async (req, res) => {
  const { status, priority } = req.body || {};
  const updates = [];
  const values  = [];
  if (status && VALID_STATUSES.includes(status)) {
    values.push(status);
    updates.push(`status = $${values.length}`);
    if (status === 'resolved') updates.push('resolved_at = NOW()');
  }
  if (priority && VALID_PRIORITIES.includes(priority)) {
    values.push(priority);
    updates.push(`priority = $${values.length}`);
  }
  if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });
  updates.push('updated_at = NOW()');
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, status, priority`,
      values
    );
    if (!rows.length) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ success: true, ticket: rows[0] });
  } catch (err) {
    console.error('[system ticket update]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = { schoolAdminTicketsRouter, systemAdminTicketsRouter };
