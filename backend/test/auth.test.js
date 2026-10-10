import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { adminLogin, getAdminMe } from '../src/controllers/adminController.js';
import { authenticateAdmin } from '../src/middleware/adminAuth.js';
import Admin from '../src/models/Admin.js';
import mongoose from 'mongoose';

// Disable query buffering in tests so queries without DB connection fail-fast immediately
mongoose.set('bufferCommands', false);

// Setup an ephemeral Express testing app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/admin/login', adminLogin);
  app.get('/api/admin/me', authenticateAdmin, getAdminMe);
  return app;
}

test('Admin Authentication Suite', async (t) => {
  const originalEnv = { ...process.env };
  const testPassword = 'Clixer@123';
  const testHash = bcrypt.hashSync(testPassword, 10);
  const testSecret = 'test_jwt_secret_key_1234567890';

  // Helper to run HTTP requests against ephemeral server
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
    process.env.ADMIN_PASSWORD_HASH = testHash;
    process.env.JWT_SECRET = testSecret;
  });

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test('1. Valid intended admin credentials succeed and return valid JWT', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: testPassword })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.admin.email, 'clixer@admin.com');
      assert.equal(data.admin.role, 'admin');
      assert.ok(data.token, 'Token must be present in response');

      // Verify token signature with JWT_SECRET
      const decoded = jwt.verify(data.token, testSecret);
      assert.equal(decoded.email, 'clixer@admin.com');
      assert.equal(decoded.role, 'admin');
    });
  });

  await t.test('2. Normalized email (uppercase & whitespace) authenticates successfully', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '   CLIXER@ADMIN.COM   ', password: testPassword })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.admin.email, 'clixer@admin.com');
    });
  });

  await t.test('3. Incorrect password returns 401 Unauthorized', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: 'WrongPassword999' })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /invalid admin/i);
    });
  });

  await t.test('4. Unknown admin email returns 401 Unauthorized', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@example.com', password: testPassword })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /invalid admin/i);
    });
  });

  await t.test('5. Missing email or password returns 400 Bad Request', async () => {
    await withServer(async (baseUrl) => {
      const resNoPass = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com' })
      });
      assert.equal(resNoPass.status, 400);

      const resNoEmail = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: testPassword })
      });
      assert.equal(resNoEmail.status, 400);
    });
  });

  await t.test('6. Unconfigured server credentials returns 500 server configuration error', async () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD;

    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: testPassword })
      });

      // Crucial test: missing server credentials must NOT report 401 (bad credentials)
      assert.equal(res.status, 500);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /configuration error/i);
    });
  });

  await t.test('7. Quotes around hash in environment are cleanly trimmed', async () => {
    process.env.ADMIN_PASSWORD_HASH = `"${testHash}"`;

    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: testPassword })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
    });
  });

  await t.test('8. Protected admin route /api/admin/me works with valid token and rejects invalid token', async () => {
    await withServer(async (baseUrl) => {
      // Step A: Login to get token
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'clixer@admin.com', password: testPassword })
      });
      const { token } = await loginRes.json();

      // Step B: Access /api/admin/me with valid token
      const meRes = await fetch(`${baseUrl}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(meRes.status, 200);
      const meData = await meRes.json();
      assert.equal(meData.success, true);
      assert.equal(meData.admin.email, 'clixer@admin.com');

      // Step C: Access with missing token -> 401
      const noTokenRes = await fetch(`${baseUrl}/api/admin/me`);
      assert.equal(noTokenRes.status, 401);

      // Step D: Access with malformed/forged token -> 401
      const forgedTokenRes = await fetch(`${baseUrl}/api/admin/me`, {
        headers: { Authorization: 'Bearer forged.invalid.token' }
      });
      assert.equal(forgedTokenRes.status, 401);
    });
  });

  await t.test('9. Database admin lookup fallback functions when env var is absent', async () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD;

    // Temporarily mock Admin.findOne
    const origFindOne = Admin.findOne;
    Admin.findOne = async ({ email }) => {
      if (email === 'dbadmin@clixer.in') {
        return { email: 'dbadmin@clixer.in', password: testHash, role: 'admin' };
      }
      return null;
    };

    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'dbadmin@clixer.in', password: testPassword })
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.admin.email, 'dbadmin@clixer.in');
      });
    } finally {
      Admin.findOne = origFindOne;
    }
  });
});
