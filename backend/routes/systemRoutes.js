// ============================================================
//  system-routes.js — System admin school & admin management
//  Features: School management, admin assignment, DB image storage
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SYSTEM_JWT_SECRET = process.env.SYSTEM_JWT_SECRET || 'change_me_system';

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
//  SYSTEM ADMIN AUTHENTICATION
// ─────────────────────────────────────────────────────────────

// POST /api/system/login - System admin login
// POST /api/system/login - System admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Query system_admin table (singular)
    const result = await pool.query(
      'SELECT id, username, name, password_hash FROM system_admin WHERE username = $1',
      [username]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name },
      SYSTEM_JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Update last login
    await pool.query(
      'UPDATE system_admin SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    return res.json({
      success: true,
      token,
      username: admin.username,
      name: admin.name
    });
  } catch (err) {
    console.error('[system-login error]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
// ─────────────────────────────────────────────────────────────
//  IMAGE MANAGEMENT
// ─────────────────────────────────────────────────────────────

// POST /api/system/schools/:schoolId/upload-image
// Upload school image to database (binary storage)
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
// Retrieve school image from database
router.get('/schools/:schoolId/image', async (req, res) => {
  const { schoolId } = req.params;

  try {
    const result = await pool.query(
      `SELECT si.image_data, si.mime_type
       FROM school_images si
       JOIN schools s ON s.image_id = si.id
       WHERE s.id = $1`,
      [schoolId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { image_data, mime_type } = result.rows[0];

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week cache
    return res.send(image_data);
  } catch (err) {
    console.error('[get-image error]', err);
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
         s.grades, s.streams, s.is_active, s.created_at, s.image_id,
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
  const { name, location, phone, email, principal, grades, streams, imageBase64 } = req.body;

  if (!name?.trim() || !location?.trim()) {
    return res.status(400).json({ error: 'School name and location are required' });
  }

  try {
    // Create school
    const schoolResult = await pool.query(
      `INSERT INTO schools (name, location, phone, email, principal, grades, streams)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name.trim(),
        location.trim(),
        phone || null,
        email || null,
        principal || null,
        JSON.stringify(grades || ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
        JSON.stringify(streams || ['Physics', 'Commerce', 'Humanities'])
      ]
    );

    const school = schoolResult.rows[0];
    let imageId = null;

    // Upload image if provided
    if (imageBase64) {
      try {
        let imageBuffer;
        let mimeType = 'image/jpeg';

        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBuffer = Buffer.from(matches[2], 'base64');
        } else {
          imageBuffer = Buffer.from(imageBase64, 'base64');
        }

        const imgResult = await pool.query(
          `INSERT INTO school_images (school_id, image_data, mime_type, file_size)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [school.id, imageBuffer, mimeType, imageBuffer.length]
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

    return res.status(201).json({
      success: true,
      school: { ...school, image_id: imageId }
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
  const { name, location, phone, email, principal, grades, streams, imageBase64, isActive } = req.body;

  try {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (location !== undefined) {
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
    if (grades !== undefined) {
      updateFields.push(`grades = $${paramIndex++}`);
      values.push(JSON.stringify(grades));
    }
    if (streams !== undefined) {
      updateFields.push(`streams = $${paramIndex++}`);
      values.push(JSON.stringify(streams));
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    values.push(schoolId);
    updateFields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE schools SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Handle image upload if provided
    if (imageBase64) {
      try {
        let imageBuffer;
        let mimeType = 'image/jpeg';

        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBuffer = Buffer.from(matches[2], 'base64');
        } else {
          imageBuffer = Buffer.from(imageBase64, 'base64');
        }

        // Delete old image
        await pool.query('DELETE FROM school_images WHERE school_id = $1', [schoolId]);

        // Insert new image
        const imgResult = await pool.query(
          `INSERT INTO school_images (school_id, image_data, mime_type, file_size)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [schoolId, imageBuffer, mimeType, imageBuffer.length]
        );

        await pool.query(
          'UPDATE schools SET image_id = $1 WHERE id = $2',
          [imgResult.rows[0].id, schoolId]
        );
      } catch (imgErr) {
        console.error('[image update error]', imgErr);
        // Continue even if image fails
      }
    }

    return res.json({
      success: true,
      school: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
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
      `SELECT id, name, username, is_active, temp_password_flag, created_at, last_login
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

// POST /api/system/schools/:schoolId/admins - Create admin for school
router.post('/schools/:schoolId/admins', requireSystemAdmin, async (req, res) => {
  const { schoolId } = req.params;
  const { name, username, password } = req.body;

  if (!name?.trim() || !username?.trim() || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Verify school exists
    const school = await pool.query('SELECT id, name FROM schools WHERE id = $1', [schoolId]);
    if (!school.rows[0]) {
      return res.status(404).json({ error: 'School not found' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO school_admins (name, username, password_hash, school_id, temp_password_flag)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, name, username, is_active, temp_password_flag, created_at`,
      [name.trim(), username.trim(), hash, schoolId]
    );

    return res.status(201).json({
      success: true,
      admin: result.rows[0],
      schoolName: school.rows[0].name
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/schools/:schoolId/admins/:adminId - Update admin
router.patch('/schools/:schoolId/admins/:adminId', requireSystemAdmin, async (req, res) => {
  const { schoolId, adminId } = req.params;
  const { name, email, isActive } = req.body;

  try {
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(adminId);
    values.push(schoolId);

    const result = await pool.query(
      `UPDATE school_admins
       SET ${updates.join(', ')}
       WHERE id = $${idx} AND school_id = $${idx + 1}
       RETURNING id, name, username, is_active, created_at`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.json({
      success: true,
      admin: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/system/schools/:schoolId/admins/:adminId - Delete admin
router.delete('/schools/:schoolId/admins/:adminId', requireSystemAdmin, async (req, res) => {
  const { schoolId, adminId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM school_admins
       WHERE id = $1 AND school_id = $2
       RETURNING username`,
      [adminId, schoolId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.json({
      success: true,
      message: `Admin "${result.rows[0].username}" removed`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/schools/:schoolId/admins/:adminId/reset-password - Reset admin password
router.patch('/schools/:schoolId/admins/:adminId/reset-password', requireSystemAdmin, async (req, res) => {
  const { schoolId, adminId } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `UPDATE school_admins
       SET password_hash = $1, temp_password_flag = false
       WHERE id = $2 AND school_id = $3
       RETURNING id, username, is_active`,
      [hash, adminId, schoolId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, requireSystemAdmin };
