import express from 'express';
import {
  adminLogin,
  getAdminMe,
  getAdminProfile,
  changeAdminEmail,
  changeAdminPassword
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Public login endpoint
router.post('/login', adminLogin);

// Protected admin profile & verification endpoints
router.get('/me', authenticateAdmin, getAdminMe);
router.get('/profile', authenticateAdmin, getAdminProfile);

// Protected admin credential management endpoints
router.put('/change-email', authenticateAdmin, changeAdminEmail);
router.put('/change-password', authenticateAdmin, changeAdminPassword);

export default router;
