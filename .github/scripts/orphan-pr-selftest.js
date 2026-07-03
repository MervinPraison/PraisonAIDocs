const assert = require('assert');
const orphan = require('./orphan-pr.js');

assert.strictEqual(
  orphan.prTitleFromIssue({ title: 'docs: add memory page' }),
  'docs: add memory page'
);
assert.strictEqual(
  orphan.prTitleFromIssue({ title: 'Add memory page' }),
  'docs: Add memory page'
);
assert.strictEqual(orphan.ISSUE_BRANCH_PREFIX(1476), 'claude/issue-1476-');

console.log('orphan-pr-selftest: ok');
