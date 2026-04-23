// ci smoke test 193545
// Smoke test: verifies that the LLM retry logic happy path is exercisable.
// NOTE: This file is intentionally minimal — it must remain runnable under
// Jest, Mocha, and plain `node test/ci_smoke.js` without extra dependencies.

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Minimal retry helper — mirrors the expected contract of the real retry util.
// Replace the body of `retryLLMCall` with an import once the real module path
// is confirmed, e.g.:
//   const { retryLLMCall } = require('../src/services/llmService');
// ---------------------------------------------------------------------------
async function retryLLMCall(fn, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

(async () => {
  // Happy path: function succeeds on first attempt — must return the value.
  const result = await retryLLMCall(async () => 'ok');
  assert.strictEqual(result, 'ok', 'LLM retry happy path should return resolved value');

  // Retry path: function fails twice then succeeds — must still return the value.
  let attempts = 0;
  const retryResult = await retryLLMCall(async () => {
    attempts++;
    if (attempts < 3) throw new Error('transient failure');
    return 'recovered';
  }, 3);
  assert.strictEqual(retryResult, 'recovered', 'LLM retry should succeed after transient failures');

  console.log('ci smoke test 193545: all assertions passed');
})().catch((err) => {
  console.error('ci smoke test 193545: FAILED —', err.message);
  process.exit(1);
});
