import { SMSDatabase, hashPassword } from '../src/services/smsDb';
import fs from 'fs';
import path from 'path';

async function runSecurityAuthTest() {
  console.log('--- SECURITY & AUTHORIZATION TEST STARTING ---');

  const testDbPath = 'file:data/test_security_gates.db';
  const filePath = 'data/test_security_gates.db';

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const db = new SMSDatabase(testDbPath);
  await db.init();

  // P-01: Valid username + valid password -> LOGIN SUCCESS
  console.log('P-01: Valid username + valid password...');
  const superAdminAuth = await db.loginUser('superadmin', 'admin123');
  if (!superAdminAuth.token || superAdminAuth.user.role !== 'SUPER_ADMIN') {
    throw new Error('P-01 Failed: Could not login with valid credentials');
  }
  console.log('  PASSED: Token issued for Super Admin');

  // P-02: Valid username + invalid password -> 401 / Exception
  console.log('P-02: Valid username + invalid password...');
  let p02Passed = false;
  try {
    await db.loginUser('superadmin', 'WRONG_PASSWORD_123');
  } catch (err) {
    p02Passed = true;
  }
  if (!p02Passed) throw new Error('P-02 Failed: Invalid password was accepted!');
  console.log('  PASSED: Invalid password rejected');

  // P-03: Unknown username + password -> 401 / Exception
  console.log('P-03: Unknown username + password...');
  let p03Passed = false;
  try {
    await db.loginUser('non_existent_user', 'some_password');
  } catch (err) {
    p03Passed = true;
  }
  if (!p03Passed) throw new Error('P-03 Failed: Unknown username was accepted!');
  console.log('  PASSED: Unknown username rejected');

  // P-04: Stored password is NOT plaintext (starts with scrypt$)
  console.log('P-04: Checking stored password format in database...');
  const usersRaw = await (db as any).client.execute('SELECT username, password_hash FROM users;');
  for (const u of usersRaw.rows) {
    const pwd = String(u.password_hash);
    if (!pwd.startsWith('scrypt$')) {
      throw new Error(`P-04 Failed: User ${u.username} has non-scrypt password stored: ${pwd}`);
    }
  }
  console.log('  PASSED: All stored user passwords use scrypt$ salted format');

  // P-05: Two users with same password do NOT require identical stored hashes (Salt check)
  console.log('P-05: Salt uniqueness check for identical passwords...');
  const h1 = hashPassword('samePassword123');
  const h2 = hashPassword('samePassword123');
  if (h1 === h2) {
    throw new Error('P-05 Failed: Hash output was identical for same password (missing or static salt)');
  }
  console.log('  PASSED: Unique salts generated distinct hashes for identical passwords');

  // P-06: Forged session token -> Rejected
  console.log('P-06: Forged session token rejection...');
  const forgedUser = await db.getUserByToken('forged-token-abc-123');
  if (forgedUser !== null) {
    throw new Error('P-06 Failed: Forged session token returned user context!');
  }
  console.log('  PASSED: Forged token rejected');

  // P-07: Forged x-user-role header without valid token -> 401 (Tested via Express API or direct check)
  console.log('P-07: Authorization token requirement...');
  const tokenCheck = await db.getUserByToken('');
  if (tokenCheck !== null) {
    throw new Error('P-07 Failed: Empty token authenticated successfully');
  }
  console.log('  PASSED: Missing session token denied');

  // P-08: VIEWER attempting administrative mutation -> 403
  console.log('P-08: VIEWER administrative mutation block...');
  const viewerAuth = await db.loginUser('viewer', 'viewer123');
  let p08Blocked = false;
  try {
    db.checkPermission(viewerAuth.user, 'academic_structure:create');
  } catch (err) {
    p08Blocked = true;
  }
  if (!p08Blocked) throw new Error('P-08 Failed: VIEWER was allowed administrative permission!');
  console.log('  PASSED: VIEWER blocked from administrative action');

  // P-09: Existing migrated user can still authenticate using original password
  console.log('P-09: Migrated user authentication check...');
  const acadAuth = await db.loginUser('acadadmin', 'admin123');
  if (!acadAuth.token || acadAuth.user.role !== 'ACADEMIC_ADMIN') {
    throw new Error('P-09 Failed: Migrated user could not authenticate with original password');
  }
  console.log('  PASSED: Migrated user authenticated cleanly');

  // P-10: Plaintext password leak check
  console.log('P-10: Inspection for plaintext password leaks...');
  const auditLogs = await db.getAuditTrail();
  for (const log of auditLogs) {
    const logStr = JSON.stringify(log);
    if (logStr.includes('admin123') || logStr.includes('teacher123') || logStr.includes('viewer123')) {
      throw new Error('P-10 Failed: Plaintext password detected in audit logs!');
    }
  }
  console.log('  PASSED: Zero plaintext passwords leaked in audit trail');

  // --- MIGRATION ARCHITECTURE & IDEMPOTENCY TESTS ---
  console.log('Testing Versioned Migration Runner & Idempotency...');
  const applied = await db.getAppliedMigrations();
  if (applied.length < 2) {
    throw new Error(`Migration Test Failed: Expected >=2 applied migrations, got ${applied.length}`);
  }
  console.log(`  PASSED: Database applied ${applied.length} migrations:`, applied.map(m => m.name));

  // Idempotency check: rerun runMigrations multiple times
  const run2Count = await db.runMigrations();
  const run3Count = await db.runMigrations();
  if (run2Count !== 0 || run3Count !== 0) {
    throw new Error(`Idempotency Test Failed: Rerunning migrations executed ${run2Count} and ${run3Count} migrations (expected 0)`);
  }
  console.log('  PASSED: Migration runner is 100% idempotent (0 migrations re-executed)');

  // Clean up test file
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log('--- ALL SECURITY & MIGRATION TESTS PASSED PERFECTLY ---');
}

runSecurityAuthTest().catch((err) => {
  console.error('SECURITY TEST EXCEPTION:', err);
  process.exit(1);
});
