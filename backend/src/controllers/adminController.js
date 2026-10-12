import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Helper to resolve credentials for an email address from either
 * MongoDB Admin collection or environment variables.
 */
export const resolveCurrentAdmin = async (currentEmail) => {
  const normalizedEmail = String(currentEmail || '').trim().toLowerCase();
  const configAdminEmail = (process.env.ADMIN_EMAIL || 'clixer@admin.com').trim().toLowerCase();

  let adminDoc = null;
  try {
    adminDoc = await Admin.findOne({ email: normalizedEmail });
  } catch (err) {
    console.error('[Admin Auth] DB query error in resolveCurrentAdmin:', err.message);
  }

  if (adminDoc && adminDoc.password) {
    return {
      adminDoc,
      passwordHash: String(adminDoc.password).trim().replace(/^["']|["']$/g, ''),
      role: adminDoc.role || 'admin',
      source: 'database'
    };
  }

  // If not found in DB, check if matching environment variable fallback
  if (normalizedEmail === configAdminEmail) {
    const rawEnvHash = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
    if (typeof rawEnvHash === 'string' && rawEnvHash.trim().length > 0) {
      return {
        adminDoc: null,
        passwordHash: rawEnvHash.trim().replace(/^["']|["']$/g, ''),
        role: 'admin',
        source: 'env'
      };
    }
  }

  return { adminDoc: null, passwordHash: null, role: 'admin', source: 'none' };
};

/**
 * Helper to compare candidate password against bcrypt hash or plain dev match
 */
export const verifyPassword = async (candidatePassword, storedHash) => {
  if (!candidatePassword || !storedHash) return false;
  const isBcryptHash =
    typeof storedHash === 'string' &&
    (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$'));

  if (isBcryptHash) {
    try {
      return await bcrypt.compare(String(candidatePassword), storedHash);
    } catch (err) {
      console.error('[Admin Auth] Error comparing password hash:', err.message);
      return false;
    }
  }

  // Plain-text match fallback for local dev
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Admin Auth Warning] Password credential is not stored as a bcrypt hash.');
  }
  return String(candidatePassword) === storedHash;
};

/**
 * Admin Login Endpoint
 * POST /api/admin/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const configAdminEmail = (process.env.ADMIN_EMAIL || 'clixer@admin.com').trim().toLowerCase();

    // 1. Check MongoDB Admin collection first
    let passwordHash = null;
    let adminRole = 'admin';

    try {
      const adminRecord = await Admin.findOne({ email: trimmedEmail });
      if (adminRecord && typeof adminRecord.password === 'string' && adminRecord.password.trim().length > 0) {
        passwordHash = adminRecord.password.trim().replace(/^["']|["']$/g, '');
        adminRole = adminRecord.role || 'admin';
      }
    } catch (dbErr) {
      console.error('[Admin Auth] Error checking Admin model in database:', dbErr.message);
    }

    // 2. If not found in DB, check if DB has any admin records
    let hasDbAdmins = false;
    if (!passwordHash) {
      try {
        const count = await Admin.countDocuments();
        if (count > 0) hasDbAdmins = true;
      } catch {
        hasDbAdmins = false;
      }

      // Only fall back to env if no admin accounts exist in MongoDB
      if (!hasDbAdmins && trimmedEmail === configAdminEmail) {
        const rawEnvHash = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
        if (typeof rawEnvHash === 'string' && rawEnvHash.trim().length > 0) {
          passwordHash = rawEnvHash.trim().replace(/^["']|["']$/g, '');
        }
      }
    }

    // 3. Validate presence of credentials
    if (!passwordHash) {
      if (!hasDbAdmins && trimmedEmail === configAdminEmail) {
        console.error(
          '[Admin Auth Error] Missing configuration: Neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set in environment, and no admin record exists in MongoDB.'
        );
        return res.status(500).json({
          success: false,
          message: 'Server authentication configuration error. Admin credentials are not configured on the server. Please configure ADMIN_PASSWORD_HASH in environment variables.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid admin email or password.'
      });
    }

    // 4. Validate password using bcrypt or plain match fallback
    const isPasswordValid = await verifyPassword(password, passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin email or password.'
      });
    }

    // 5. Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'clixer_default_jwt_secret_fallback_key';
    const token = jwt.sign(
      {
        email: trimmedEmail,
        role: adminRole
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully.',
      token,
      admin: {
        email: trimmedEmail,
        role: adminRole
      }
    });
  } catch (error) {
    console.error('Admin login error:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Unable to connect to the server. Please try again.'
    });
  }
};

/**
 * Get Admin Profile / Me
 * GET /api/admin/profile & GET /api/admin/me
 */
export const getAdminProfile = async (req, res) => {
  try {
    const currentEmail = String(req.admin?.email || '').trim().toLowerCase();
    if (!currentEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin identity not found.'
      });
    }

    let safeEmail = currentEmail;
    let safeRole = req.admin?.role || 'admin';

    try {
      const dbAdmin = await Admin.findOne({ email: currentEmail });
      if (dbAdmin) {
        safeEmail = dbAdmin.email;
        safeRole = dbAdmin.role || safeRole;
      }
    } catch {
      // Fall back to token values if DB is buffering or not yet populated
    }

    return res.status(200).json({
      success: true,
      admin: {
        email: safeEmail,
        role: safeRole
      }
    });
  } catch (error) {
    console.error('Admin profile error:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify admin status.'
    });
  }
};

export const getAdminMe = getAdminProfile;

/**
 * Change Admin Email
 * PUT /api/admin/change-email
 */
export const changeAdminEmail = async (req, res) => {
  try {
    const currentEmail = String(req.admin?.email || '').trim().toLowerCase();
    if (!currentEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin identity not found in authentication token.'
      });
    }

    const { currentPassword, newEmail, confirmEmail } = req.body;

    // 1. Validation
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required to authorize changing email.'
      });
    }

    if (!newEmail || typeof newEmail !== 'string' || !newEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New email address is required.'
      });
    }

    const trimmedNewEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedNewEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (confirmEmail !== undefined && confirmEmail !== null) {
      const trimmedConfirm = String(confirmEmail).trim().toLowerCase();
      if (trimmedNewEmail !== trimmedConfirm) {
        return res.status(400).json({
          success: false,
          message: 'New email address and confirmation email do not match.'
        });
      }
    }

    if (trimmedNewEmail === currentEmail) {
      return res.status(400).json({
        success: false,
        message: 'New email must be different from current email.'
      });
    }

    // 2. Verify current password
    const { adminDoc, passwordHash, role } = await resolveCurrentAdmin(currentEmail);
    if (!passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or credentials not configured.'
      });
    }

    const isMatch = await verifyPassword(currentPassword, passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // 3. Check for conflict with existing administrator account
    try {
      const conflict = await Admin.findOne({ email: trimmedNewEmail });
      if (conflict && conflict.email !== currentEmail) {
        return res.status(409).json({
          success: false,
          message: 'This email is already assigned to another account.'
        });
      }
    } catch (dbErr) {
      console.error('[Admin Auth] Error checking existing email conflict:', dbErr.message);
    }

    // 4. Persist change to MongoDB
    let savedAdmin;
    if (adminDoc) {
      adminDoc.email = trimmedNewEmail;
      savedAdmin = await adminDoc.save();
    } else {
      // First-time migration from environment variable config to MongoDB
      savedAdmin = await Admin.create({
        email: trimmedNewEmail,
        password: passwordHash,
        role: role || 'admin'
      });
    }

    // 5. Generate fresh JWT token for updated identity
    const jwtSecret = process.env.JWT_SECRET || 'clixer_default_jwt_secret_fallback_key';
    const token = jwt.sign(
      {
        email: trimmedNewEmail,
        role: savedAdmin.role || 'admin'
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin email updated successfully.',
      token,
      admin: {
        email: trimmedNewEmail,
        role: savedAdmin.role || 'admin'
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Error changing email:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update admin email. Please try again.'
    });
  }
};

/**
 * Change Admin Password
 * PUT /api/admin/change-password
 */
export const changeAdminPassword = async (req, res) => {
  try {
    const currentEmail = String(req.admin?.email || '').trim().toLowerCase();
    if (!currentEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin identity not found in authentication token.'
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 1. Validation
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required.'
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'New password is required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    if (confirmPassword !== undefined && confirmPassword !== null) {
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirmation password do not match.'
        });
      }
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.'
      });
    }

    // 2. Verify current password
    const { adminDoc, passwordHash, role } = await resolveCurrentAdmin(currentEmail);
    if (!passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or credentials not configured.'
      });
    }

    const isMatch = await verifyPassword(currentPassword, passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // 3. Hash new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // 4. Persist to MongoDB
    let savedAdmin;
    if (adminDoc) {
      adminDoc.password = hashedNewPassword;
      savedAdmin = await adminDoc.save();
    } else {
      // First-time migration from environment variable config to MongoDB
      savedAdmin = await Admin.create({
        email: currentEmail,
        password: hashedNewPassword,
        role: role || 'admin'
      });
    }

    // 5. Generate fresh JWT token
    const jwtSecret = process.env.JWT_SECRET || 'clixer_default_jwt_secret_fallback_key';
    const token = jwt.sign(
      {
        email: currentEmail,
        role: savedAdmin.role || 'admin'
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin password changed successfully.',
      token,
      admin: {
        email: currentEmail,
        role: savedAdmin.role || 'admin'
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Error changing password:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update admin password. Please try again.'
    });
  }
};
