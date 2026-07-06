#!/usr/bin/env node
/**
 * Run: node .github/scripts/pipeline-status-selftest.js
 */
const ps = require('./pipeline-status.js');
const mg = require('./merge-gate.js');

let failed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error('FAIL:', name);
    failed++;
  } else {
    console.log('ok:', name);
  }
}

const kickComments = [
  { user: { login: 'MervinPraison' }, body: '@coderabbitai review' },
  { user: { login: 'MervinPraison' }, body: '/review' },
];

const finalComment = {
  user: { login: 'MervinPraison' },
  body: '@claude You are the FINAL architecture reviewer.',
  created_at: '2026-06-26T10:00:00Z',
};

assert(
  'not ready maps to awaiting merge gate',
  ps.deriveStage([], { ready: false, reasons: ['CI not green on HEAD'] })
    === 'pipeline/awaiting-merge-gate'
);
assert(
  'not ready after review kicks still awaiting merge gate',
  ps.deriveStage(kickComments, { ready: false, reasons: ['no FINAL Claude review trigger'] })
    === 'pipeline/awaiting-merge-gate'
);
assert(
  'awaiting merge gate when in cooldown',
  ps.deriveStage(
    [...kickComments, finalComment],
    { ready: false, reasons: ['recent @claude within 35min'] }
  ) === 'pipeline/awaiting-merge-gate'
);
assert(
  'merge ready',
  ps.deriveStage([...kickComments, finalComment], { ready: true, reasons: [] })
    === 'pipeline/merge-ready'
);

const blockers = ps.deriveBlockerLabels({
  ready: false,
  reasons: ['CI not green on HEAD', 'SDK code added without test file changes — requires manual review'],
});
assert('maps ci blocker', blockers.includes('pipeline/blocked:ci'));
assert('maps manual blocker', blockers.includes('pipeline/blocked:manual-review'));

assert(
  'internal link matches upstream base',
  mg.isInternalPullRequestLink(
    { base: { repo: { full_name: 'MervinPraison/PraisonAIDocs' } } },
    'MervinPraison',
    'PraisonAIDocs'
  )
);
assert(
  'fork sync link rejected',
  !mg.isInternalPullRequestLink(
    { number: 21, base: { repo: { full_name: 'Milkmange/PraisonAIDocs' } } },
    'MervinPraison',
    'PraisonAIDocs'
  )
);

const now = Date.parse('2026-07-06T18:00:00Z');
assert(
  'skip conflict dispatch when scan in progress',
  ps.shouldSkipConflictScanDispatch(
    { id: 1, status: 'in_progress', created_at: '2026-07-06T17:45:00Z' },
    now
  )
);
assert(
  'skip conflict dispatch when scan finished recently',
  ps.shouldSkipConflictScanDispatch(
    { id: 2, status: 'completed', created_at: '2026-07-06T17:50:00Z' },
    now
  )
);
assert(
  'allow conflict dispatch when last run is stale',
  !ps.shouldSkipConflictScanDispatch(
    { id: 3, status: 'completed', created_at: '2026-07-06T17:00:00Z' },
    now
  )
);

process.exit(failed ? 1 : 0);
