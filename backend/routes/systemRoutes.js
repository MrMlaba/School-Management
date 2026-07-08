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
         COUNT(DISTINCT a.id) AS application_count
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

// Creating, editing, deleting, and resetting passwords for school-admin
// accounts all now live solely under /api/system/admins/* (backend/auth.js) —
// see SystemAdminsPage.jsx. This file keeps only the read-only per-school
// list above, used for the read-only summary on the Schools page.

module.exports = { router, requireSystemAdmin };