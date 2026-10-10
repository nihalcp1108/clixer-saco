import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

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

    // 1. Resolve password hash from Environment or MongoDB
    let passwordHash = null;

    if (trimmedEmail === configAdminEmail) {
      const rawEnvHash = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
      if (typeof rawEnvHash === 'string' && rawEnvHash.trim().length > 0) {
        passwordHash = rawEnvHash.trim().replace(/^["']|["']$/g, '');
      }
    }

    // If not found in environment, check MongoDB Admin collection
    if (!passwordHash) {
      try {
        const adminRecord = await Admin.findOne({ email: trimmedEmail });
        if (adminRecord && typeof adminRecord.password === 'string' && adminRecord.password.trim().length > 0) {
          passwordHash = adminRecord.password.trim().replace(/^["']|["']$/g, '');
        }
      } catch (dbErr) {
        console.error('[Admin Auth] Error checking Admin model in database:', dbErr.message);
      }
    }

    // 2. Validate presence of credentials
    if (!passwordHash) {
      if (trimmedEmail === configAdminEmail) {
        // Email matches configured admin, but credentials are missing on the server
        console.error(
          '[Admin Auth Error] Missing configuration: Neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set in environment, and no admin record exists in MongoDB.'
        );
        return res.status(500).json({
          success: false,
          message: 'Server authentication configuration error. Admin credentials are not configured on the server. Please configure ADMIN_PASSWORD_HASH in environment variables.'
        });
      }

      // Email does not match configured admin and does not exist in database
      return res.status(401).json({
        success: false,
        message: 'Invalid admin email or password.'
      });
    }

    // 3. Validate password using bcrypt or plain match fallback
    let isPasswordValid = false;
    const isBcryptHash =
      typeof passwordHash === 'string' &&
      (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2y$'));

    if (isBcryptHash) {
      try {
        isPasswordValid = await bcrypt.compare(String(password), passwordHash);
      } catch (err) {
        console.error('[Admin Auth] Error comparing password hash:', err.message);
        isPasswordValid = false;
      }
    } else {
      // Plain-text match fallback for local dev
      if (process.env.NODE_ENV === 'production') {
        console.warn('[Admin Auth Warning] Password credential is not stored as a bcrypt hash.');
      }
      isPasswordValid = String(password) === passwordHash;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin email or password.'
      });
    }

    // 4. Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'clixer_default_jwt_secret_fallback_key';
    const token = jwt.sign(
      {
        email: trimmedEmail,
        role: 'admin'
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
        role: 'admin'
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

export const getAdminMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: {
        email: req.admin.email,
        role: req.admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify admin status.'
    });
  }
};
