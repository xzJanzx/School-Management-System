import { smsTestSuite } from '../src/tests/smsModule03TestSuite';

async function executeFullSuite() {
  console.log('=== RUNNING FULL ACCEPTANCE GATES SUITE (C-01..C-26) AGAINST SQLITE ===');
  const results = await smsTestSuite.runAllTests();

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    if (r.passed) {
      passed++;
      console.log(`[PASS] ${r.code} — ${r.name}: ${r.message}`);
    } else {
      failed++;
      console.error(`[FAIL] ${r.code} — ${r.name}: ${r.message}`);
    }
  }

  console.log(`\n=== SUMMARY: TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed} ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

executeFullSuite().catch((err) => {
  console.error('SUITE EXCEPTION:', err);
  process.exit(1);
});
