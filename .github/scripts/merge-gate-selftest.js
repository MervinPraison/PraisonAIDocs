#!/usr/bin/env node
/**
 * Local self-test for merge-gate.js heuristics (no GitHub API).
 * Run: node .github/scripts/merge-gate-selftest.js
 */
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

// Stale FINAL: push after FINAL, no @claude since head
const finals = [
  { user: { login: 'github-actions[bot]' }, body: '@claude FINAL architecture reviewer', created_at: '2026-06-12T08:00:00Z' },
];
assert('stale when head after final', mg.isStaleFinalAfterPush(finals, '2026-06-12T09:00:00Z'));

const withRecovery = [
  ...finals,
  { user: { login: 'github-actions[bot]' }, body: '@claude FINAL architecture reviewer', created_at: '2026-06-12T09:30:00Z' },
];
assert('not stale when @claude after head', !mg.isStaleFinalAfterPush(withRecovery, '2026-06-12T09:00:00Z'));

// Bot CHANGES_REQUESTED then APPROVE
const reviews = [
  { user: { login: 'coderabbit[bot]', type: 'Bot' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-06-12T08:00:00Z' },
  { user: { login: 'coderabbit[bot]', type: 'Bot' }, state: 'APPROVED', submitted_at: '2026-06-12T09:00:00Z' },
];
assert('bot approve clears CR', !mg.hasAnyChangesRequested(reviews));
assert('human CR blocks', mg.hasAnyChangesRequested([
  { user: { login: 'MervinPraison', type: 'User' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-06-12T09:00:00Z' },
]));

// Verdict after HEAD
const verdictComments = [
  { body: 'MERGE_GATE_VERDICT: APPROVE', created_at: '2026-06-12T08:00:00Z' },
];
assert('verdict before head rejected', mg.findMergeGateVerdict(verdictComments, null, '2026-06-12T09:00:00Z') === null);
assert('verdict after head accepted', mg.findMergeGateVerdict(
  [{ body: 'MERGE_GATE_VERDICT: APPROVE', created_at: '2026-06-12T10:00:00Z' }],
  null,
  '2026-06-12T09:00:00Z'
) === 'APPROVE');

const noise = [{ user: { login: 'MervinPraison' }, body: '**Merge gate scan** — wait for `@claude`', created_at: new Date().toISOString() }];
assert('diagnostic comment not a trigger', !mg.hasRecentClaudeTrigger(noise, 35));

// Cooldown skip requires an actual verdict on HEAD, not just a FINAL trigger comment
const recentFinalOnHead = [
  {
    user: { login: 'MervinPraison' },
    body: '@claude You are the FINAL architecture reviewer.',
    created_at: '2026-06-27T10:00:00Z',
  },
];
assert(
  'final trigger alone does not count as verdict on head',
  mg.findMergeGateVerdict(recentFinalOnHead, null, '2026-06-27T09:55:00Z') === null
);
const recentVerdictOnHead = [
  ...recentFinalOnHead,
  {
    user: { login: 'github-actions[bot]' },
    body: 'MERGE_GATE_VERDICT: APPROVE',
    created_at: '2026-06-27T10:05:00Z',
  },
];
assert(
  'verdict on head skips cooldown gate',
  mg.findMergeGateVerdict(recentVerdictOnHead, null, '2026-06-27T09:55:00Z') === 'APPROVE'
);

// Sensitive + secrets
assert('workflow path sensitive', mg.sensitivePathReasons([{ filename: '.github/workflows/foo.yml' }]).length === 1);
assert('ci-only label exempts workflows', mg.sensitivePathReasons(
  [{ filename: '.github/workflows/foo.yml' }],
  [mg.WORKFLOW_ONLY_LABEL]
).length === 0);
assert('ci-only label not exempt mixed changes', mg.sensitivePathReasons(
  [{ filename: '.github/workflows/foo.yml' }, { filename: 'src/foo.py' }],
  [mg.WORKFLOW_ONLY_LABEL]
).length === 1);
assert('secret in patch', mg.secretScanReasons([{ filename: 'x.py', patch: '+key = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"' }]).length === 1);

// Nav-only docs.json exempt from manual-review sensitive path
const navOnlyPatch = [
  '--- a/docs.json',
  '+++ b/docs.json',
  '@@ -10,6 +10,7 @@',
  '     "pages": [',
  '+      "docs/features/new-page",',
  '     ]',
].join('\n');
assert('nav-only docs.json not sensitive', mg.sensitivePathReasons([{ filename: 'docs.json', patch: navOnlyPatch }]).length === 0);
const themePatch = navOnlyPatch.replace('+      "docs/features/new-page",', '+  "theme": "dark",');
assert('docs.json theme change still sensitive', mg.sensitivePathReasons([{ filename: 'docs.json', patch: themePatch }]).length === 1);

const commaFixPatch = [
  '--- a/docs.json',
  '+++ b/docs.json',
  '@@ -1123,7 +1123,8 @@',
  '-              "docs/features/mongodb-memory"',
  '+              "docs/features/mongodb-memory",',
  '+              "docs/features/dakera-memory"',
].join('\n');
assert('comma-fix nav docs.json not sensitive', mg.sensitivePathReasons([{ filename: 'docs.json', patch: commaFixPatch }]).length === 0);

const navRemovalPatch = [
  '--- a/docs.json',
  '+++ b/docs.json',
  '@@ -10,6 +10,5 @@',
  '     "pages": [',
  '-      "docs/cli/doctor",',
  '     ]',
].join('\n');
assert('nav path removal still sensitive', mg.sensitivePathReasons([{ filename: 'docs.json', patch: navRemovalPatch }]).length === 1);

const conflictMarkerPatch = navOnlyPatch.replace('+      "docs/features/new-page",', '+<<<<<<< HEAD');
assert('conflict markers in docs.json blocked', !mg.isNavOnlyDocsJsonPatch(conflictMarkerPatch));

const docsPrimaryFiles = [
  { filename: 'docs/features/foo.mdx', additions: 840 },
];
assert('docs-primary allows larger audit file', mg.prSizeReasons(docsPrimaryFiles).length === 0);

const sdkMirrorFiles = [
  { filename: 'docs/features/toolsets.mdx', additions: 34 },
  { filename: 'praisonaiagents/toolsets.py', additions: 8 },
];
assert('small SDK mirror sync ok without tests', mg.missingTestsReason(sdkMirrorFiles) === null);

// Stale-FINAL recovery guards (PraisonAI #2334 parity)
const finalAt = '2026-07-03T10:00:00Z';
const pushSoonAfter = '2026-07-03T10:05:00Z';
const staleComments = [
  { user: { login: 'MervinPraison' }, body: '@claude FINAL architecture reviewer', created_at: finalAt },
  { user: { login: 'praisonai-triage-agent[bot]' }, body: 'Claude finished', created_at: '2026-07-03T10:04:00Z' },
];
assert(
  'skip stale recovery when push soon after FINAL',
  mg.shouldSkipStaleFinalRecovery(staleComments, pushSoonAfter, 'praisonai-triage-agent[bot]').skip
);
assert(
  'automation pusher skips stale recovery',
  mg.shouldSkipStaleFinalRecovery(staleComments, pushSoonAfter, 'praisonai-triage-agent[bot]').skip
);
assert('isClaudeAutomationLogin triage bot', mg.isClaudeAutomationLogin('praisonai-triage-agent[bot]'));

// Cooldown: FINAL current on HEAD should not block merge gate
const finalCompleteComments = [
  { user: { login: 'MervinPraison' }, body: '@claude FINAL architecture reviewer', created_at: '2026-07-03T10:00:00Z' },
];
assert('final complete on head when not stale', mg.finalClaudeCompletedOnSha(finalCompleteComments, '2026-07-03T10:00:30Z'));
assert('final not complete when head after final without re-trigger', !mg.finalClaudeCompletedOnSha(finalCompleteComments, '2026-07-03T10:07:00Z'));

// Claude run scoping — other PR branches must not block
assert('other branch claude does not block', !mg.hasBlockingClaudeRunForPr(
  [{ event: 'issue_comment', head_branch: 'other-branch' }],
  'my-branch'
));
assert('same branch claude blocks', mg.hasBlockingClaudeRunForPr(
  [{ event: 'issue_comment', head_branch: 'my-branch' }],
  'my-branch'
));
assert('issues event never blocks', !mg.hasBlockingClaudeRunForPr(
  [{ event: 'issues', head_branch: 'my-branch' }],
  'my-branch'
));

// Conflict rebase clears after bot completion + FINAL on HEAD (within 12h cooldown)
const conflictNowMs = Date.now();
const conflictIso = (offsetMs) => new Date(conflictNowMs + offsetMs).toISOString();
const conflictTrigger = {
  user: { login: 'MervinPraison' },
  body: '@claude this PR has merge conflicts with main. Please rebase',
  created_at: conflictIso(-30 * 60 * 1000),
};
const rebaseDone = {
  user: { login: 'praisonai-triage-agent[bot]' },
  body: 'Rebase complete — PR #2308 onto latest main',
  created_at: conflictIso(-29 * 60 * 1000),
};
const finalAfterRebase = {
  user: { login: 'MervinPraison' },
  body: '@claude You are the FINAL architecture reviewer.',
  created_at: conflictIso(-20 * 60 * 1000),
};
const headAfterRebase = conflictIso(-21 * 60 * 1000);
const rebaseComments = [conflictTrigger, rebaseDone, finalAfterRebase];
assert('conflict blocks before rebase done', mg.hasRecentConflictComment([conflictTrigger], headAfterRebase));
assert('conflict clears after rebase + FINAL on HEAD', !mg.hasRecentConflictComment(rebaseComments, headAfterRebase));
assert('conflict still blocks without FINAL on HEAD', mg.hasRecentConflictComment(
  [conflictTrigger, rebaseDone],
  headAfterRebase
));

// Tests heuristic (synced SDK copies in docs repo)
assert('sdk without tests', mg.missingTestsReason([{ filename: 'praisonaiagents/a/b.py', additions: 3 }]) !== null);
assert('sdk with tests ok', mg.missingTestsReason([
  { filename: 'praisonaiagents/a/b.py', additions: 3 },
  { filename: 'praisonaiagents/tests/test_x.py', additions: 10 },
]) === null);

// PR size
assert('large PR blocked', mg.prSizeReasons([{ additions: 900 }]).length > 0);

assert('internal PR link accepted', mg.isInternalPullRequestLink(
  { base: { repo: { full_name: 'MervinPraison/PraisonAIDocs' } } },
  'MervinPraison',
  'PraisonAIDocs'
));
assert('fork sync PR link rejected', !mg.isInternalPullRequestLink(
  { number: 21, base: { repo: { full_name: 'Milkmange/PraisonAIDocs' } } },
  'MervinPraison',
  'PraisonAIDocs'
));

// Merge-gate active label stale after 45 min with no in-progress assess
const now = Date.parse('2026-07-03T12:00:00Z');
assert(
  'blocks when assess in progress',
  mg.shouldBlockOnMergeGateActiveLabel({ assessInProgress: true, lastActivityMs: null, nowMs: now }).block
);
assert(
  'blocks within 45m grace after last activity',
  mg.shouldBlockOnMergeGateActiveLabel({
    assessInProgress: false,
    lastActivityMs: now - 30 * 60 * 1000,
    nowMs: now,
  }).block
);
assert(
  'stale after 45m with no assess running',
  mg.shouldBlockOnMergeGateActiveLabel({
    assessInProgress: false,
    lastActivityMs: now - 46 * 60 * 1000,
    nowMs: now,
  }).stale
);
assert(
  'stale when label stuck with no activity record',
  mg.shouldBlockOnMergeGateActiveLabel({ assessInProgress: false, lastActivityMs: null, nowMs: now }).stale
);
assert('merge gate job name matches PR', mg.mergeGateJobTargetsPr('claude-assess (1460, abc123)', 1460));
assert('merge gate job name rejects other PR', !mg.mergeGateJobTargetsPr('claude-assess (1461, abc123)', 1460));

process.exit(failed ? 1 : 0);
