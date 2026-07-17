// ============================================================
//  system-routes.js — System admin school & admin management
//  Features: School management, admin assignment, DB image storage
//
//  UPDATED: School LOGO is now a separate image from the home-page
//  PICTURE. Pictures live in school_images (schools.image_id);
//  logos live in school_logos (schools.logo_id). Both are optional.
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SYSTEM_JWT_SECRET = process.env.SYSTEM_JWT_SECRET;
if (!SYSTEM_JWT_SECRET) throw new Error('SYSTEM_JWT_SECRET environment variable is required');

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE: System Admin Authentication
// ─────────────────────────────────────────────────────────────
const requireSystemAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(header.split(' ')[1], SYSTEM_JWT_SECRET);
    req.sysAdmin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────────────────────
//  HELPERS: base64 → buffer storage for picture & logo
// ─────────────────────────────────────────────────────────────

// Convert a base64 string (with or without a data: prefix) into a buffer + mime.
function decodeBase64Image(base64, fallbackMime) {
  let mimeType = fallbackMime;
  let buffer;
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64, 'base64');
  }
  return { buffer, mimeType };
}

// Store (or replace) a school's LOGO in school_logos and point schools.logo_id at it.
async function storeSchoolLogo(schoolId, logoBase64) {
  const { buffer, mimeType } = decodeBase64Image(logoBase64, 'image/png');

  // Replace any existing logo for this school
  await pool.query('DELETE FROM school_logos WHERE school_id = $1', [schoolId]);

  const result = await pool.query(
    `INSERT INTO school_logos (school_id, image_data, mime_type, file_size)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [schoolId, buffer, mimeType, buffer.length]
  );

  const logoId = result.rows[0].id;
  await pool.query('UPDATE schools SET logo_id = $1 WHERE id = $2', [logoId, schoolId]);
  return logoId;
}

// ─────────────────────────────────────────────────────────────
//  IMAGE MANAGEMENT (home-page picture)
// ─────────────────────────────────────────────────────────────

// POST /api/system/schools/:schoolId/upload-image
// Upload school PICTURE to database (binary storage)
router.post('/schools/:schoolId/upload-image', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;
  if (!req.body || !req.body.image) {
    return res.status(400).json({ error: 'Image data required' });
  }

  try {
    // Verify school exists
    const school = await pool.query('SELECT id FROM schools WHERE id = $1', [schoolId]);
    if (!school.rows[0]) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Convert base64 to buffer
    let imageBuffer;
    let mimeType = 'image/jpeg';

    if (typeof req.body.image === 'string') {
      // Handle base64 string
      const matches = req.body.image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(req.body.image, 'base64');
      }
    } else if (Buffer.isBuffer(req.body.image)) {
      imageBuffer = req.body.image;
    } else {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Delete old image if exists
    const oldImage = await pool.query(
      'SELECT id FROM school_images WHERE school_id = $1',
      [schoolId]
    );

    if (oldImage.rows[0]) {
      await pool.query('DELETE FROM school_images WHERE id = $1', [oldImage.rows[0].id]);
    }

    // Insert new image
    const result = await pool.query(
      `INSERT INTO school_images (school_id, image_data, mime_type, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [schoolId, imageBuffer, mimeType, imageBuffer.length]
    );

    const imageId = result.rows[0].id;

    // Update school to reference image
    await pool.query(
      'UPDATE schools SET image_id = $1 WHERE id = $2',
      [imageId, schoolId]
    );

    return res.json({
      success: true,
      imageId,
      message: 'Image uploaded successfully'
    });
  } catch (err) {
    console.error('[upload-image error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/system/schools/:schoolId/image
// Retrieve school PICTURE from database (public — used on home page)
router.get('/schools/:schoolId/image', async (req, res) => {
  const { schoolId } = req.params;

  try {
    const result = await pool.query(
      `SELECT si.image_data, si.mime_type, si.id as image_id
       FROM school_images si
       JOIN schools s ON s.image_id = si.id
       WHERE s.id = $1`,
      [schoolId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { image_data, mime_type, image_id } = result.rows[0];

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // 24h cache + immutable for versioned URLs
    res.setHeader('ETag', `"${image_id}"`); // Add ETag for better cache validation
    return res.send(image_data);
  } catch (err) {
    console.error('[get-image error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  LOGO MANAGEMENT (separate from the home-page picture)
// ─────────────────────────────────────────────────────────────

// POST /api/system/schools/:schoolId/upload-logo
// Upload school LOGO to database (binary storage)
router.post('/schools/:schoolId/upload-logo', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;
  const logoBase64 = req.body && (req.body.logo || req.body.image);
  if (!logoBase64) {
    return res.status(400).json({ error: 'Logo data required' });
  }

  try {
    const school = await pool.query('SELECT id FROM schools WHERE id = $1', [schoolId]);
    if (!school.rows[0]) {
      return res.status(404).json({ error: 'School not found' });
    }

    const logoId = await storeSchoolLogo(schoolId, logoBase64);

    return res.json({
      success: true,
      logoId,
      message: 'Logo uploaded successfully'
    });
  } catch (err) {
    console.error('[upload-logo error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/system/schools/:schoolId/logo
// Retrieve school LOGO from database (public — used in dashboards & PDF reports).
// Looked up directly by school_id (UNIQUE) so it can't desync from schools.logo_id.
router.get('/schools/:schoolId/logo', async (req, res) => {
  const { schoolId } = req.params;

  try {
    const result = await pool.query(
      `SELECT image_data, mime_type, id AS image_id
       FROM school_logos
       WHERE school_id = $1`,
      [schoolId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    const { image_data, mime_type, image_id } = result.rows[0];

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('ETag', `"logo-${image_id}"`);
    return res.send(image_data);
  } catch (err) {
    console.error('[get-logo error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/system/schools/:schoolId/logo
// Remove a school's logo (logo is optional)
router.delete('/schools/:schoolId/logo', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;
  try {
    await pool.query('UPDATE schools SET logo_id = NULL WHERE id = $1', [schoolId]);
    await pool.query('DELETE FROM school_logos WHERE school_id = $1', [schoolId]);
    return res.json({ success: true, message: 'Logo removed' });
  } catch (err) {
    console.error('[delete-logo error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  SCHOOL MANAGEMENT
// ─────────────────────────────────────────────────────────────

// GET /api/system/schools - Get all schools with admin count
router.get('/schools', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.id, s.name, s.location, s.phone, s.email, s.principal,
         s.grades, s.streams, s.is_active, s.created_at, s.image_id, s.logo_id,
         s.created_by, s.updated_by, s.updated_at,
         COUNT(DISTINCT sa.id) AS admin_count,
         COUNT(DISTINCT a.id)                                               AS application_count,
         COUNT(DISTINCT a.id)                                               AS total_applications,
         COUNT(DISTINCT CASE WHEN a.status = 'pending'  THEN a.id END)     AS pending_applications,
         COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END)     AS approved_count,
         COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN a.id END)     AS rejected_count
       FROM schools s
       LEFT JOIN school_admins sa ON sa.school_id = s.id AND sa.is_active = true
       LEFT JOIN applications a ON a.school = s.name
       GROUP BY s.id
       ORDER BY s.name`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/system/schools - Create new school
router.post('/schools', requireSystemAdmin, async (req, res) => {
  const { name, location, phone, email, principal, grades, streams, imageBase64, logoBase64 } = req.body;

  if (!name?.trim() || !location?.trim()) {
    return res.status(400).json({ error: 'School name and location are required' });
  }

  try {
    // Create school
    const schoolResult = await pool.query(
      `INSERT INTO schools (name, location, phone, email, principal, grades, streams, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name.trim(),
        location.trim(),
        phone || null,
        email || null,
        principal || null,
        JSON.stringify(grades || ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
        JSON.stringify(streams || ['Physics', 'Commerce', 'Humanities']),
        req.sysAdmin.username,
      ]
    );

    const school = schoolResult.rows[0];
    let imageId = null;
    let logoId = null;

    // Upload PICTURE if provided
    if (imageBase64) {
      try {
        const { buffer, mimeType } = decodeBase64Image(imageBase64, 'image/jpeg');

        const imgResult = await pool.query(
          `INSERT INTO school_images (school_id, image_data, mime_type, file_size)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [school.id, buffer, mimeType, buffer.length]
        );

        imageId = imgResult.rows[0].id;

        // Update school with image reference
        await pool.query(
          'UPDATE schools SET image_id = $1 WHERE id = $2',
          [imageId, school.id]
        );
      } catch (imgErr) {
        console.error('[image upload error]', imgErr);
        // Continue even if image fails
      }
    }

    // Upload LOGO if provided
    if (logoBase64) {
      try {
        logoId = await storeSchoolLogo(school.id, logoBase64);
      } catch (logoErr) {
        console.error('[logo upload error]', logoErr);
        // Continue even if logo fails
      }
    }

    return res.status(201).json({
      success: true,
      school: { ...school, image_id: imageId, logo_id: logoId }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'School name already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/schools/:schoolId - Update school
router.patch('/schools/:schoolId', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;
  const { name, location, phone, email, principal, grades, streams, imageBase64, logoBase64, isActive } = req.body;

  try {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined && name !== null) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (location !== undefined && location !== null) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (principal !== undefined) {
      updateFields.push(`principal = $${paramIndex++}`);
      values.push(principal);
    }
    if (grades !== undefined && grades !== null) {
      updateFields.push(`grades = $${paramIndex++}`);
      values.push(JSON.stringify(grades));
    }
    if (streams !== undefined && streams !== null) {
      updateFields.push(`streams = $${paramIndex++}`);
      values.push(JSON.stringify(streams));
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    // If no fields to update except possibly an image/logo, still allow the request
    if (updateFields.length === 0 && !imageBase64 && !logoBase64) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    let result = { rows: [{}] };

    if (updateFields.length > 0) {
      values.push(schoolId);
      result = await pool.query(
        `UPDATE schools SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'School not found' });
      }
    } else {
      // If only updating image/logo, fetch current school
      result = await pool.query(
        `SELECT * FROM schools WHERE id = $1`,
        [schoolId]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'School not found' });
      }
    }

    let updatedSchool = result.rows[0];

    // Handle PICTURE upload if provided
    if (imageBase64) {
      try {
        const { buffer, mimeType } = decodeBase64Image(imageBase64, 'image/jpeg');

        // Delete old image
        await pool.query('DELETE FROM school_images WHERE school_id = $1', [schoolId]);

        // Insert new image
        const imgResult = await pool.query(
          `INSERT INTO school_images (school_id, image_data, mime_type, file_size)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [schoolId, buffer, mimeType, buffer.length]
        );

        const newImageId = imgResult.rows[0].id;

        await pool.query(
          'UPDATE schools SET image_id = $1 WHERE id = $2',
          [newImageId, schoolId]
        );

        // Update the returned school object with the new image_id
        updatedSchool = { ...updatedSchool, image_id: newImageId };
      } catch (imgErr) {
        console.error('[image update error]', imgErr);
        // Continue even if image fails
      }
    }

    // Handle LOGO upload if provided
    if (logoBase64) {
      try {
        const newLogoId = await storeSchoolLogo(schoolId, logoBase64);
        updatedSchool = { ...updatedSchool, logo_id: newLogoId };
      } catch (logoErr) {
        console.error('[logo update error]', logoErr);
        // Continue even if logo fails
      }
    }

    // Every successful PATCH counts as a modification — stamp who and when,
    // regardless of which specific fields above actually changed. Only the
    // latest stamp is kept; the full history already lives in audit_logs.
    const stamp = await pool.query(
      `UPDATE schools SET updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING updated_by, updated_at`,
      [req.sysAdmin.username, schoolId]
    );
    updatedSchool = { ...updatedSchool, ...stamp.rows[0] };

    return res.json({
      success: true,
      school: updatedSchool
    });
  } catch (err) {
    console.error('[PATCH /schools error]', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE /api/system/schools/:schoolId - Delete school
router.delete('/schools/:schoolId', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM schools WHERE id = $1 RETURNING name',
      [schoolId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'School not found' });
    }

    return res.json({
      success: true,
      message: `School "${result.rows[0].name}" deleted`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  ADMIN MANAGEMENT FOR SCHOOLS
// ─────────────────────────────────────────────────────────────

// GET /api/system/schools/:schoolId/admins - Get all admins for a school
router.get('/schools/:schoolId/admins', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, username, is_active, temp_password_flag,
              created_at, created_by, updated_by, updated_at, last_login
       FROM school_admins
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [schoolId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── AI chat — system admin asks questions about platform data ─────────────────
// POST /api/system/ai-chat
// Body: { message: string, history?: [{role, content}] }
// Uses Groq (llama-3.3-70b) with live platform stats as system context.
router.post('/ai-chat', requireSystemAdmin, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(503).json({ error: 'AI not configured' });

  try {
    const [appR, schoolR, adminR] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending,
                         COUNT(*) FILTER (WHERE status='approved') AS approved,
                         COUNT(*) FILTER (WHERE status='rejected') AS rejected
                  FROM applications`),
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM schools`),
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM school_admins`),
    ]);

    const stats = {
      applications: appR.rows[0],
      schools:      schoolR.rows[0],
      admins:       adminR.rows[0],
    };

    const systemPrompt = `You are an AI assistant for a School Management System (SMS) — a South African school enrollment and management platform. You are embedded in the Service Provider Console used by the system administrator.

Current platform stats (live data):
- Schools: ${stats.schools.active} active / ${stats.schools.total} total
- School admins: ${stats.admins.active} active / ${stats.admins.total} total
- Applications: ${stats.applications.total} total — ${stats.applications.pending} pending, ${stats.applications.approved} approved, ${stats.applications.rejected} rejected

Answer concisely. If asked about specific schools or students, explain you only have aggregate stats here. If asked what you can do, mention you can explain platform data, suggest actions, and answer questions about the SMS system.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: message },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 400, temperature: 0.5 }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('[ai-chat] Groq error:', err);
      return res.status(502).json({ error: 'AI service error' });
    }

    const groqData = await groqRes.json();
    const reply = groqData.choices?.[0]?.message?.content || 'No response.';
    return res.json({ reply });
  } catch (err) {
    console.error('[ai-chat]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, requireSystemAdmin };