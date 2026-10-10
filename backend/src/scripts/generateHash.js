import bcrypt from 'bcryptjs';

/**
 * Clixer / SACO — Password Hash Generator Utility
 * 
 * Usage:
 *   node src/scripts/generateHash.js "YourPasswordHere"
 *   OR
 *   node src/scripts/generateHash.js
 *   (defaults to generating hash for 'Clixer@123' if no argument provided)
 */

const password = process.argv[2] || 'Clixer@123';

try {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const isValid = bcrypt.compareSync(password, hash);
  if (!isValid) {
    throw new Error('Self-verification test failed for generated hash.');
  }

  console.log('\n======================================================');
  console.log(' Clixer / SACO — Password Hash Generated Successfully');
  console.log('======================================================');
  console.log('Self-verification passed: true');
  console.log('\nCopy the following value into your Render Environment:');
  console.log('Key:   ADMIN_PASSWORD_HASH');
  console.log(`Value: ${hash}`);
  console.log('======================================================\n');
} catch (error) {
  console.error('Error generating password hash:', error.message);
  process.exit(1);
}
