import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  adminLogin,
  getAdminProfile,
  getAdminMe,
  changeAdminEmail,
  changeAdminPassword
} from '../src/controllers/adminController.js';
import { authenticateAdmin } from '../src/middleware/adminAuth.js';
import Admin from '../src/models/Admin.js';
import mongoose from 'mongoose';

// Disable query buffering in tests so queries without DB connection fail-fast immediately
mongoose.set('bufferCommands', false);

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/admin/login', adminLogin);
  app.get('/api/admin/me', authenticateAdmin, getAdminMe);
  app.get('/api/admin/profile', authenticateAdmin, getAdminProfile);
  app.put('/api/admin/change-email', authenticateAdmin, changeAdminEmail);
  app.put('/api/admin/change-password', authenticateAdmin, changeAdminPassword);
  return app;
}

test('Admin Account Settings Suite (Change Email & Password)', async (t) => {
  const originalEnv = { ...process.env };
  const initialPassword = 'Initial@Password123';
  const initialHash = bcrypt.hashSync(initialPassword, 10);
  const testSecret = 'test_jwt_secret_settings_suite_987654321';

  async function withServer(fn) {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      await fn(baseUrl);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  t.beforeEach(() => {
    process.env.ADMIN_EMAIL = 'clixer@admin.com';
    process.env.ADMIN_PASSWORD_HASH = initialHash;
    process.env.JWT_SECRET = testSecret;
  });

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test('1. Authenticated admin can load their profile (/api/admin/profile)', async () => {
    await withServer(async (baseUrl) => {
      // Step A: Login to get token
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
      });
      assert.equal(loginRes.status, 200);
      const { token } = await loginRes.json();

      // Step B: Load profile
      const profRes = await fetch(`${baseUrl}/api/admin/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(profRes.status, 200);
      const profData = await profRes.json();
      assert.equal(profData.success, true);
      assert.equal(profData.admin.email, 'clixer@admin.com');
      assert.equal(profData.admin.role, 'admin');
    });
  });

  await t.test('2. Unauthenticated requests to change email or password are rejected (401)', async () => {
    await withServer(async (baseUrl) => {
      const emailRes = await fetch(`${baseUrl}/api/admin/change-email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newEmail: 'hacker@clixer.com'
        })
      });
      assert.equal(emailRes.status, 401);

      const passRes = await fetch(`${baseUrl}/api/admin/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: 'NewPassword@2026'
        })
      });
      assert.equal(passRes.status, 401);
    });
  });

  await t.test('3. Incorrect current password prevents email changes (401)', async () => {
    await withServer(async (baseUrl) => {
      // Login
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
      });
      const { token } = await loginRes.json();

      // Attempt change with wrong current password
      const changeRes = await fetch(`${baseUrl}/api/admin/change-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: 'WrongPassword999',
          newEmail: 'newemail@clixer.in',
          confirmEmail: 'newemail@clixer.in'
        })
      });

      assert.equal(changeRes.status, 401);
      const data = await changeRes.json();
      assert.equal(data.success, false);
      assert.match(data.message, /current password is incorrect/i);
    });
  });

  await t.test('4. Invalid or mismatched email is rejected (400)', async () => {
    await withServer(async (baseUrl) => {
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
      });
      const { token } = await loginRes.json();

      // Test invalid email format
      const invalidRes = await fetch(`${baseUrl}/api/admin/change-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newEmail: 'not-an-email'
        })
      });
      assert.equal(invalidRes.status, 400);

      // Test mismatched confirm email
      const mismatchRes = await fetch(`${baseUrl}/api/admin/change-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newEmail: 'new@clixer.in',
          confirmEmail: 'other@clixer.in'
        })
      });
      assert.equal(mismatchRes.status, 400);
      const mismatchData = await mismatchRes.json();
      assert.match(mismatchData.message, /do not match/i);
    });
  });

  await t.test('5. Duplicate email conflict is rejected (409)', async () => {
    const origFindOne = Admin.findOne;
    // Mock that 'taken@clixer.in' exists
    Admin.findOne = async ({ email }) => {
      if (email === 'taken@clixer.in') {
        return { email: 'taken@clixer.in', password: 'hash' };
      }
      return null;
    };

    try {
      await withServer(async (baseUrl) => {
        const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
        });
        const { token } = await loginRes.json();

        const conflictRes = await fetch(`${baseUrl}/api/admin/change-email`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: initialPassword,
            newEmail: 'taken@clixer.in',
            confirmEmail: 'taken@clixer.in'
          })
        });

        assert.equal(conflictRes.status, 409);
        const data = await conflictRes.json();
        assert.equal(data.success, false);
        assert.match(data.message, /already assigned to another/i);
      });
    } finally {
      Admin.findOne = origFindOne;
    }
  });

  await t.test('6. Incorrect current password prevents password changes (401)', async () => {
    await withServer(async (baseUrl) => {
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
      });
      const { token } = await loginRes.json();

      const changeRes = await fetch(`${baseUrl}/api/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: 'WrongPassword999',
          newPassword: 'BrandNewSecurePassword@2026',
          confirmPassword: 'BrandNewSecurePassword@2026'
        })
      });

      assert.equal(changeRes.status, 401);
      const data = await changeRes.json();
      assert.match(data.message, /current password is incorrect/i);
    });
  });

  await t.test('7. Password confirmation mismatch or short password is rejected (400)', async () => {
    await withServer(async (baseUrl) => {
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
      });
      const { token } = await loginRes.json();

      // Less than 8 characters
      const shortRes = await fetch(`${baseUrl}/api/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: 'short',
          confirmPassword: 'short'
        })
      });
      assert.equal(shortRes.status, 400);
      const shortData = await shortRes.json();
      assert.match(shortData.message, /at least 8 characters/i);

      // Mismatch
      const mismatchRes = await fetch(`${baseUrl}/api/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: 'BrandNewSecurePassword@2026',
          confirmPassword: 'DifferentPassword@2026'
        })
      });
      assert.equal(mismatchRes.status, 400);
      const mismatchData = await mismatchRes.json();
      assert.match(mismatchData.message, /do not match/i);
    });
  });

  await t.test('8. Full Lifecycle: Change Password persists to DB, old password rejected, new password succeeds', async () => {
    // In-memory mock DB storage to verify persistence across calls and restarts
    const inMemoryDb = new Map();

    const origFindOne = Admin.findOne;
    const origCreate = Admin.create;
    const origCountDocuments = Admin.countDocuments;

    Admin.findOne = async ({ email }) => {
      if (inMemoryDb.has(email)) {
        return inMemoryDb.get(email);
      }
      return null;
    };

    Admin.create = async (doc) => {
      const record = {
        ...doc,
        save: async function () {
          inMemoryDb.set(this.email, this);
          return this;
        }
      };
      inMemoryDb.set(doc.email, record);
      return record;
    };

    Admin.countDocuments = async () => inMemoryDb.size;

    try {
      await withServer(async (baseUrl) => {
        // Step 1: Login with initial credentials
        const login1 = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
        });
        assert.equal(login1.status, 200);
        const { token } = await login1.json();

        // Step 2: Change password to new password
        const newPassword = 'NewSecretPassword@2026!';
        const changeRes = await fetch(`${baseUrl}/api/admin/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: initialPassword,
            newPassword,
            confirmPassword: newPassword
          })
        });
        assert.equal(changeRes.status, 200);
        const changeData = await changeRes.json();
        assert.equal(changeData.success, true);
        assert.ok(changeData.token, 'Should return fresh token');

        // Step 3: Verify old password fails
        const oldLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
        });
        assert.equal(oldLoginRes.status, 401, 'Old password must be rejected');

        // Step 4: Verify new password succeeds
        const newLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'clixer@admin.com', password: newPassword })
        });
        assert.equal(newLoginRes.status, 200, 'New password must succeed');
        const newLoginData = await newLoginRes.json();
        assert.equal(newLoginData.admin.email, 'clixer@admin.com');
      });
    } finally {
      Admin.findOne = origFindOne;
      Admin.create = origCreate;
      Admin.countDocuments = origCountDocuments;
    }
  });

  await t.test('9. Full Lifecycle: Change Email persists to DB, old email rejected, new email succeeds', async () => {
    const inMemoryDb = new Map();
    const origFindOne = Admin.findOne;
    const origCreate = Admin.create;
    const origCountDocuments = Admin.countDocuments;

    Admin.findOne = async ({ email }) => inMemoryDb.get(email) || null;
    Admin.create = async (doc) => {
      const record = {
        ...doc,
        save: async function () {
          inMemoryDb.set(this.email, this);
          return this;
        }
      };
      inMemoryDb.set(doc.email, record);
      return record;
    };
    Admin.countDocuments = async () => inMemoryDb.size;

    try {
      await withServer(async (baseUrl) => {
        // Step 1: Login
        const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
        });
        const { token } = await loginRes.json();

        // Step 2: Change email to new email
        const newEmail = 'director@clixer.in';
        const changeRes = await fetch(`${baseUrl}/api/admin/change-email`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: initialPassword,
            newEmail,
            confirmEmail: newEmail
          })
        });

        assert.equal(changeRes.status, 200);
        const changeData = await changeRes.json();
        assert.equal(changeData.success, true);
        assert.equal(changeData.admin.email, newEmail);

        // Step 3: Login with old email should fail now that DB admin exists
        const oldEmailLogin = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'clixer@admin.com', password: initialPassword })
        });
        assert.equal(oldEmailLogin.status, 401, 'Old email must not authenticate once DB has active admin');

        // Step 4: Login with new email succeeds
        const newEmailLogin = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newEmail, password: initialPassword })
        });
        assert.equal(newEmailLogin.status, 200, 'New email must succeed');
        const newLoginData = await newEmailLogin.json();
        assert.equal(newLoginData.admin.email, newEmail);
      });
    } finally {
      Admin.findOne = origFindOne;
      Admin.create = origCreate;
      Admin.countDocuments = origCountDocuments;
    }
  });
});
