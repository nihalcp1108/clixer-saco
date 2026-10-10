import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

dotenv.config();

/**
 * Clixer / SACO — Safe Admin Seed / Update Utility
 * 
 * Safely creates or updates the intended admin account in MongoDB Atlas
 * WITHOUT modifying, dropping, or affecting any product catalogue or other records.
 * 
 * Usage:
 *   node src/scripts/seedAdmin.js
 */

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('Error: MONGO_URI is not set in environment or .env file.');
  process.exit(1);
}

const adminEmail = (process.env.ADMIN_EMAIL || 'clixer@admin.com').trim().toLowerCase();

async function run() {
  try {
    const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to MongoDB at ${maskedUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Determine password hash to store
    let hashToStore = process.env.ADMIN_PASSWORD_HASH;
    if (hashToStore) {
      hashToStore = hashToStore.trim().replace(/^["']|["']$/g, '');
    } else {
      // Generate standard bcrypt hash for default password
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Clixer@123';
      const salt = bcrypt.genSaltSync(10);
      hashToStore = bcrypt.hashSync(defaultPassword, salt);
    }

    // Safely upsert admin record (preserves existing DB data completely)
    const updatedAdmin = await Admin.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          email: adminEmail,
          password: hashToStore,
          role: 'admin'
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    console.log('\n======================================================');
    console.log(' Admin Account Configured in MongoDB Successfully');
    console.log('======================================================');
    console.log(`Admin Email: ${updatedAdmin.email}`);
    console.log(`Admin Role:  ${updatedAdmin.role}`);
    console.log(`Record ID:   ${updatedAdmin._id}`);
    console.log('Product catalogue and existing collections remain untouched.');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to configure admin in MongoDB:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

run();
