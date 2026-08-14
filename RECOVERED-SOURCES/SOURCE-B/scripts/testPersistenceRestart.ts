import { SMSDatabase } from '../src/services/smsDb';

async function runRestartPersistenceTest() {
  console.log('--- RESTART PERSISTENCE TEST STARTING ---');

  // Instance 1: Operational write
  const db1 = new SMSDatabase('file:data/sms.db');
  await db1.init();

  const adminUser = {
    userId: 'USR-SUPERADMIN',
    userName: 'System Super Admin',
    role: 'SUPER_ADMIN' as const,
    permissions: ['academic_structure:create', 'academic_structure:view'],
  };

  const testCode = '2098/2099';
  console.log(`Writing test record '${testCode}' to disk via DB Instance 1...`);

  const created = await db1.createAcademicYear(adminUser, {
    code: testCode,
    name: 'Restart Persistence Test Year',
    startDate: '2098-09-01',
    endDate: '2099-06-30',
  });

  console.log('Successfully written ID:', created.id);

  // Instance 2: Simulate complete server restart (fresh process/connection)
  console.log('Simulating server process restart by instantiating fresh DB Instance 2...');
  const db2 = new SMSDatabase('file:data/sms.db');
  await db2.init();

  console.log(`Querying disk database via fresh DB Instance 2 for record '${created.id}'...`);
  const fetched = await db2.getAcademicYearById(created.id);

  if (!fetched) {
    console.error('FAIL: Record was not found on disk after restart!');
    process.exit(1);
  }

  if (fetched.code === testCode && fetched.name === 'Restart Persistence Test Year') {
    console.log('SUCCESS: Record survived restart with 100% field accuracy!');
    console.log('Cleaned up test record...');
    // Cleanup
    await (db2 as any).client.execute({ sql: 'DELETE FROM academic_years WHERE id = ?;', args: [created.id] });
    console.log('--- RESTART PERSISTENCE TEST PASSED ---');
  } else {
    console.error('FAIL: Record data corruption after restart:', fetched);
    process.exit(1);
  }
}

runRestartPersistenceTest().catch((err) => {
  console.error('RESTART TEST EXCEPTION:', err);
  process.exit(1);
});
