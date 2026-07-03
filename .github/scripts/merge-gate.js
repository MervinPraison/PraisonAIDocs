/**
 * Shared merge-gate helpers for claude-merge-gate.yml
 * @see .github/workflows/claude-merge-gate.yml
 */

const CLAUDE_TRIGGER_LOGINS = ['MervinPraison', 'github-actions[bot]'];
const AUTO_ACTORS = CLAUDE_TRIGGER_LOGINS;
const CONFLICT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const CLAUDE_ACTIVE_MS = 35 * 60 * 1000;
const STALE_FINAL_RECOVERY_WINDOW_MS = 60 * 60 * 1000;
const STALE_FINAL_MAX_PER_WINDOW = 2;
const PUSH_AFTER_FINAL_DEBOUNCE_MS = 15 * 60 * 1000;
const ALLOWED_MERGE_STATES = new Set(['CLEAN', 'UNSTABLE']);
const BLOAT_FILE_MAX_AUTO_LINES = 100;
const PR_MAX_AUTO_ADDITIONS = 800;
const PR_MAX_AUTO_FILES = 30;
const DOCS_PRIMARY_MAX_ADDITIONS = 1200;
const DOCS_PRIMARY_MAX_FILES = 80;
const DOCS_PRIMARY_MAX_SDK_ADDITIONS = 25;
const MANUAL_ONLY_LABELS = new Set(['security', 'breaking-change', 'needs-manual-review', 'release']);
const WORKFLOW_ONLY_LABEL = 'merge-gate-ci-only';
const CI_ONLY_PATH_PREFIXES = [
  '.github/workflows/',
  '.github/actions/',
  '.github/scripts/merge-gate',
  '.github/scripts/pipeline-status',
];
const SDK_PATH_PREFIXES = ['praisonaiagents/', 'praisonai/'];
const BLOAT_FILES = [];
const SENSITIVE_PATH_PATTERNS = [
  /^\.github\/workflows\//,
  /^mint\.json$/,
  /^docs\.json$/,
  /\.env(\.|$)/,
  /credentials\.json$/i,
];
const DOCS_JSON_CONFIG_KEYS = /"(theme|colors|favicon|name|icons|contextual|redirects|seo|integrations|navbar|footer|\$schema|analytics|topbar|search|logo)"/;
const REQUIRED_SDK_CHECK_PATTERNS = [];
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /github_pat_/,
  /Bearer eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const MERGE_GATE_ACTIVE_LABEL = 'claude-merge-gate-active';
const MERGE_GATE_ACTIVE_STALE_MS = 45 * 60 * 1000;
const BLOCK_LABELS = new Set([
  'claude-conflict-pending',
  MERGE_GATE_ACTIVE_LABEL,
  'no-auto-merge',
  'auto-merged-by-gate',
]);
const BOT_REVIEWER_PATTERNS = [
  'coderabbit',
  'qodo',
  'gemini',
  'copilot',
  'greptile',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isFinalClaudeTriggerComment(c) {
  const body = (c.body || '').toLowerCase();
  if (!AUTO_ACTORS.includes(c.user.login)) return false;
  if (!body.includes('@claude')) return false;
  if (body.includes('merge conflict')) return false;
  return (
    body.includes('final architecture reviewer') ||
    body.includes('final documentation reviewer') ||
    body.includes('lead engineer')
  );
}

function isClaudeTriggerNoise(c) {
  const body = c.body || '';
  if (body.includes('Merge gate scan')) return true;
  if (body.includes('MERGE_GATE_VERDICT')) return true;
  if (body.includes('Merged by **Claude PR merge gate**')) return true;
  return false;
}

function hasRecentClaudeTrigger(comments, minutes = 35) {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return comments.some((c) => {
    if (!CLAUDE_TRIGGER_LOGINS.includes(c.user.login)) return false;
    if (isClaudeTriggerNoise(c)) return false;
    if (!(c.body || '').includes('@claude')) return false;
    return new Date(c.created_at).getTime() > cutoff;
  });
}

function isConflictRebaseTriggerComment(c) {
  if (!AUTO_ACTORS.includes(c.user.login)) return false;
  const body = (c.body || '').toLowerCase();
  return body.includes('@claude') && body.includes('merge conflict');
}

function isConflictRebaseCompletionComment(c) {
  const login = (c.user?.login || '').toLowerCase();
  if (!login.includes('praisonai-triage') && !login.includes('github-actions')) return false;
  const body = (c.body || '').toLowerCase();
  return (
    body.includes('rebase complete') ||
    body.includes('rebase onto') ||
    (body.includes('conflict') && body.includes('resolved'))
  );
}

function conflictRebaseQuiescent(comments, headPushedAt) {
  const conflictTriggers = comments.filter(isConflictRebaseTriggerComment);
  if (conflictTriggers.length === 0) return true;

  const latestConflict = conflictTriggers.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );
  const conflictTime = new Date(latestConflict.created_at).getTime();

  const rebaseDone = comments.some(
    (c) =>
      new Date(c.created_at).getTime() > conflictTime && isConflictRebaseCompletionComment(c)
  );
  if (!rebaseDone) return false;

  return finalClaudeCompletedOnSha(comments, headPushedAt);
}

function hasRecentConflictComment(comments, headPushedAt = null) {
  const cutoff = Date.now() - CONFLICT_COOLDOWN_MS;
  const hasRecentTrigger = comments.some((c) => {
    if (!isConflictRebaseTriggerComment(c)) return false;
    return new Date(c.created_at).getTime() > cutoff;
  });
  if (!hasRecentTrigger) return false;

  if (headPushedAt && conflictRebaseQuiescent(comments, headPushedAt)) {
    return false;
  }
  return true;
}

function isBotReviewer(login, userType) {
  const lower = (login || '').toLowerCase();
  if (userType === 'Bot') return true;
  if (lower.endsWith('[bot]')) return true;
  return ['coderabbit', 'qodo', 'gemini', 'copilot', 'greptile'].some((p) => lower.includes(p));
}

function latestReviewsByUser(reviews) {
  const latestByUser = new Map();
  for (const r of reviews) {
    const login = r.user?.login;
    if (!login) continue;
    const prev = latestByUser.get(login);
    if (!prev || new Date(r.submitted_at) > new Date(prev.submitted_at)) {
      latestByUser.set(login, r);
    }
  }
  return latestByUser;
}

function hasHumanChangesRequested(reviews) {
  for (const [login, review] of latestReviewsByUser(reviews)) {
    if (review.state !== 'CHANGES_REQUESTED') continue;
    if (!isBotReviewer(login, review.user?.type)) return true;
  }
  return false;
}

function hasAnyChangesRequested(reviews) {
  for (const [, review] of latestReviewsByUser(reviews)) {
    if (review.state === 'CHANGES_REQUESTED') return true;
  }
  return false;
}

function hasFinalClaudeReviewTrigger(comments) {
  return comments.some(isFinalClaudeTriggerComment);
}

function isStaleFinalAfterPush(comments, headPushedAt) {
  if (!headPushedAt) return false;
  const headTime = new Date(headPushedAt).getTime();
  const finals = comments.filter(isFinalClaudeTriggerComment);
  if (finals.length === 0) return true;
  const latestFinal = finals.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );
  const finalTime = new Date(latestFinal.created_at).getTime();
  if (headTime <= finalTime + 60000) return false;
  const claudeSinceHead = comments.some((c) => {
    if (!CLAUDE_TRIGGER_LOGINS.includes(c.user.login)) return false;
    if (isClaudeTriggerNoise(c)) return false;
    if (!(c.body || '').includes('@claude')) return false;
    return new Date(c.created_at).getTime() >= headTime - 60000;
  });
  return !claudeSinceHead;
}

function needsStaleFinalRecovery(comments, headPushedAt) {
  return (
    hasFinalClaudeReviewTrigger(comments) &&
    isStaleFinalAfterPush(comments, headPushedAt)
  );
}

function shouldSkipFinalRecovery(comments, headPushedAt) {
  const isStale = isStaleFinalAfterPush(comments, headPushedAt);
  if (isStale) return false;
  return hasRecentClaudeTrigger(comments, 35);
}

function countFinalTriggersSince(comments, sinceMs) {
  return comments.filter(
    (c) => isFinalClaudeTriggerComment(c) && new Date(c.created_at).getTime() > sinceMs
  ).length;
}

function isClaudeAutomationLogin(login) {
  const lower = (login || '').toLowerCase();
  return lower.includes('praisonai-triage') || lower === 'github-actions[bot]';
}

function isPushSoonAfterLatestFinal(comments, headPushedAt) {
  if (!headPushedAt) return false;
  const finals = comments.filter(isFinalClaudeTriggerComment);
  if (finals.length === 0) return false;
  const latestFinal = finals.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );
  const finalTime = new Date(latestFinal.created_at).getTime();
  const headTime = new Date(headPushedAt).getTime();
  if (headTime <= finalTime) return false;
  return headTime - finalTime < PUSH_AFTER_FINAL_DEBOUNCE_MS;
}

/** Returns { skip: true, reason } when stale-FINAL recovery should not post. */
function shouldSkipStaleFinalRecovery(comments, headPushedAt, headPusherLogin = null) {
  if (!isStaleFinalAfterPush(comments, headPushedAt)) {
    return { skip: true, reason: 'not stale' };
  }
  if (headPusherLogin && isClaudeAutomationLogin(headPusherLogin)) {
    return { skip: true, reason: 'head pushed by Claude automation' };
  }
  if (isPushSoonAfterLatestFinal(comments, headPushedAt)) {
    return {
      skip: true,
      reason: 'head pushed soon after FINAL (wait for CI / batched fixes)',
    };
  }
  const windowStart = Date.now() - STALE_FINAL_RECOVERY_WINDOW_MS;
  const finalsInWindow = countFinalTriggersSince(comments, windowStart);
  if (finalsInWindow >= STALE_FINAL_MAX_PER_WINDOW) {
    return {
      skip: true,
      reason: `stale-FINAL capped (${finalsInWindow} FINAL triggers in last hour)`,
    };
  }
  return { skip: false, reason: '' };
}

function extractDocsNavPath(line) {
  const m = (line || '').match(/"(docs\/[^"]+)"/);
  return m ? m[1] : null;
}

function isDocsPrimaryPullRequest(files) {
  if (!files.length) return false;
  const hasDocChange = files.some((f) => {
    const name = f.filename || '';
    return name.startsWith('docs/') || name === 'docs.json';
  });
  if (!hasDocChange) return false;
  return files.every((f) => {
    const name = f.filename || '';
    return (
      name.startsWith('docs/') ||
      name === 'docs.json' ||
      SDK_PATH_PREFIXES.some((p) => name.startsWith(p))
    );
  });
}

function isNavOnlyDocsJsonPatch(patch) {
  if (!patch || /<<<<<<<|=======|>>>>>>>/.test(patch)) return false;
  const removedPaths = [];
  const addedPaths = [];
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@') || line.startsWith('+++') || line.startsWith('---')) continue;
    if (DOCS_JSON_CONFIG_KEYS.test(line)) return false;
    if (!line.startsWith('+') && !line.startsWith('-')) continue;
    const content = line.slice(1).trim();
    if (!content) continue;
    const path = extractDocsNavPath(content);
    if (line.startsWith('-')) {
      if (path) removedPaths.push(path);
      else if (/"(group|tab|pages|icon)"/.test(content)) return false;
      else if (!/^[\]},]?$/.test(content)) return false;
    } else {
      if (path) addedPaths.push(path);
      else if (/"(group|tab|pages|icon)"/.test(content)) return false;
      else if (!/^[\]},]?$/.test(content)) return false;
    }
  }
  for (const removed of removedPaths) {
    if (!addedPaths.includes(removed)) return false;
  }
  return true;
}

function finalClaudeCompletedOnSha(comments, headPushedAt) {
  if (!hasFinalClaudeReviewTrigger(comments)) return false;
  if (isStaleFinalAfterPush(comments, headPushedAt)) return false;
  return true;
}

const FINAL_CLAUDE_REVIEW_BODY =
  '@claude You are the FINAL documentation reviewer. If the branch is under MervinPraison/PraisonAIDocs (not a fork), you are able to make modifications to this branch and push directly. SCOPE: `docs/`, `docs.json`, `mint.json` — documentation only. Do NOT modify synced `praisonaiagents/` or `praisonai/` copies unless fixing a doc-blocking sync error. Read ALL comments above from Gemini, Qodo, CodeRabbit, and Copilot carefully before responding.\n\n**Phase 1: Review per AGENTS.md**\n1. SDK-first: verify against `praisonaiagents/` and `praisonai/` synced source\n2. User-focused, beginner-friendly, copy-paste runnable examples\n3. Mintlify components and Mermaid standards correct\n4. New pages go in `docs/features/` — never `docs/concepts/` without human approval\n5. Navigation updated in `docs.json` when adding pages\n\n**Phase 2: FIX Valid Issues**\n6. Fix valid doc errors, broken links, wrong imports, or Mintlify issues\n7. Push fixes directly to THIS branch (do NOT create a new PR)\n8. Comment summary of files modified and what you skipped\n\n**Phase 3: Final Verdict**\n9. If all issues are resolved, approve the PR\n10. If blocking issues remain, request changes with clear action items';

async function getMergeState(github, owner, repo, prNumber) {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          mergeStateStatus
          maintainerCanModify
          isDraft
          headRefOid
          headRef { repository { nameWithOwner } }
        }
      }
    }
  `;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await github.graphql(query, { owner, repo, number: prNumber });
    const prGql = result.repository.pullRequest;
    const status = (prGql?.mergeStateStatus || '').toUpperCase();
    if (status && status !== 'UNKNOWN') {
      return {
        status,
        isDraft: prGql.isDraft,
        headRepo: prGql.headRef?.repository?.nameWithOwner,
        headSha: prGql.headRefOid,
        maintainerCanModify: prGql.maintainerCanModify === true,
      };
    }
    if (attempt < 2) await sleep(10000);
  }
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
  return {
    status: (pr.mergeable_state || '').toUpperCase(),
    isDraft: pr.draft,
    headRepo: pr.head.repo?.full_name,
    headSha: pr.head.sha,
    maintainerCanModify: pr.maintainer_can_modify === true,
  };
}

async function allChecksGreenOnSha(github, owner, repo, sha, core, options = {}) {
  const mergeStateStatus = (options.mergeStateStatus || '').toUpperCase();
  const ignoreWhenClean = new Set(['detect-and-trigger']);
  const { data } = await github.rest.checks.listForRef({
    owner,
    repo,
    ref: sha,
    per_page: 100,
  });
  const runs = (data.check_runs || []).filter((r) => r.head_sha === sha);
  if (runs.length === 0) {
    core?.info?.(`No check runs on ${sha.slice(0, 7)} — allowing (e.g. docs-only PR)`);
    return true;
  }
  for (const run of runs) {
    if (run.status !== 'completed') {
      core?.info?.(`Check pending: ${run.name} (${run.status})`);
      return false;
    }
    const ok = ['success', 'neutral', 'skipped'].includes(run.conclusion);
    if (!ok) {
      if (mergeStateStatus === 'CLEAN' && ignoreWhenClean.has(run.name || '')) {
        core?.info?.(`Ignoring stale failed check on CLEAN PR: ${run.name}`);
        continue;
      }
      core?.info?.(`Check failed: ${run.name} (${run.conclusion})`);
      return false;
    }
  }
  return true;
}

function claudeRunBlocksPr(run, headRef) {
  if (!run || run.event === 'issues') return false;
  if (!headRef) return true;
  return run.head_branch === headRef;
}

function hasBlockingClaudeRunForPr(runs, headRef) {
  return (runs || []).some((r) => claudeRunBlocksPr(r, headRef));
}

function mergeGateJobTargetsPr(jobName, prNumber) {
  const name = jobName || '';
  return name.includes(`(${prNumber},`) || name.includes(`(${prNumber})`);
}

async function listMergeGateRuns(github, owner, repo, status = null) {
  const params = {
    owner,
    repo,
    workflow_id: 'claude-merge-gate.yml',
    per_page: 30,
  };
  if (status) params.status = status;
  const { data } = await github.rest.actions.listWorkflowRuns(params);
  return data.workflow_runs || [];
}

async function hasInProgressMergeGateForPr(github, owner, repo, prNumber) {
  try {
    const runs = await listMergeGateRuns(github, owner, repo, 'in_progress');
    for (const run of runs) {
      const { data: jobsData } = await github.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: run.id,
      });
      for (const job of jobsData.jobs || []) {
        if (!mergeGateJobTargetsPr(job.name, prNumber)) continue;
        if (job.status === 'in_progress' || job.status === 'queued') return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function getLastMergeGateActivityMs(github, owner, repo, prNumber) {
  try {
    const runs = await listMergeGateRuns(github, owner, repo);
    let latest = 0;
    for (const run of runs) {
      const { data: jobsData } = await github.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: run.id,
      });
      const hit = (jobsData.jobs || []).some((j) => mergeGateJobTargetsPr(j.name, prNumber));
      if (hit) {
        const t = new Date(run.created_at).getTime();
        if (t > latest) latest = t;
      }
    }
    return latest || null;
  } catch {
    return null;
  }
}

/** Drop stuck claude-merge-gate-active when no assess/merge job is running (45 min grace). */
async function reconcileMergeGateActiveLabel(github, owner, repo, prNumber, labels, core) {
  if (!labels.includes(MERGE_GATE_ACTIVE_LABEL)) return { block: false, stale: false };
  if (await hasInProgressMergeGateForPr(github, owner, repo, prNumber)) {
    return { block: true, stale: false };
  }
  const lastActivity = await getLastMergeGateActivityMs(github, owner, repo, prNumber);
  if (lastActivity && Date.now() - lastActivity < MERGE_GATE_ACTIVE_STALE_MS) {
    return { block: true, stale: false };
  }
  try {
    await github.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: prNumber,
      name: MERGE_GATE_ACTIVE_LABEL,
    });
    core?.info?.(`Removed stale ${MERGE_GATE_ACTIVE_LABEL} from PR #${prNumber}`);
  } catch (err) {
    if (err.status !== 404) core?.warning?.(`Could not remove stale merge-gate label: ${err.message}`);
  }
  return { block: false, stale: true };
}

function shouldBlockOnMergeGateActiveLabel({ assessInProgress, lastActivityMs, nowMs = Date.now() }) {
  if (assessInProgress) return { block: true, stale: false };
  if (lastActivityMs && nowMs - lastActivityMs < MERGE_GATE_ACTIVE_STALE_MS) {
    return { block: true, stale: false };
  }
  return { block: false, stale: true };
}

async function hasInProgressClaudeAssistant(github, owner, repo, prNumber = null) {
  try {
    const { data } = await github.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: 'claude.yml',
      status: 'in_progress',
      per_page: 20,
    });
    const runs = (data.workflow_runs || []).filter((r) => r.event !== 'issues');
    if (runs.length === 0) return false;
    if (prNumber == null) return runs.length > 0;

    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
    const headRef = pr.head.ref;
    return hasBlockingClaudeRunForPr(runs, headRef);
  } catch {
    return false;
  }
}

function isCiOnlyChange(files) {
  if (!files.length) return false;
  return files.every((f) => CI_ONLY_PATH_PREFIXES.some((p) => f.filename.startsWith(p)));
}

function isInternalPullRequestLink(link, owner, repo) {
  if (link?.base?.repo?.full_name === `${owner}/${repo}`) return true;
  const baseUrl = link?.base?.repo?.url || '';
  return baseUrl.endsWith(`/repos/${owner}/${repo}`);
}

async function resolvePrNumberFromLinkedPullRequests(github, owner, repo, linked) {
  const repoFull = `${owner}/${repo}`;
  const internal = (linked || []).filter((l) => isInternalPullRequestLink(l, owner, repo));
  for (const link of internal) {
    if (!link.number) continue;
    try {
      const { data } = await github.rest.pulls.get({
        owner,
        repo,
        pull_number: link.number,
      });
      if (data.state === 'open' && data.base?.repo?.full_name === repoFull) {
        return data.number;
      }
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }
  return null;
}

async function resolvePrNumberFromHeadBranch(github, owner, repo, branch) {
  if (!branch || branch === 'main' || branch === 'master') return null;
  const { data } = await github.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    head: `${owner}:${branch}`,
    per_page: 1,
  });
  return data[0]?.number || null;
}

async function resolvePrNumberFromWorkflowRun(github, owner, repo, workflowRun) {
  const fromLinked = await resolvePrNumberFromLinkedPullRequests(
    github, owner, repo, workflowRun.pull_requests
  );
  if (fromLinked) return fromLinked;

  const fromBranch = await resolvePrNumberFromHeadBranch(
    github, owner, repo, workflowRun.head_branch
  );
  if (fromBranch) return fromBranch;

  return null;
}

async function listPullFiles(github, owner, repo, prNumber) {
  if (typeof github.paginate === 'function') {
    return github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
  }
  const { data } = await github.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return data;
}

function getBloatFileChangeFromFiles(files) {
  for (const target of BLOAT_FILES) {
    const match = files.find((f) => f.filename === target);
    if (match) {
      return { touched: true, additions: match.additions || 0, filename: target };
    }
  }
  return { touched: false, additions: 0, filename: null };
}

async function getBloatFileChange(github, owner, repo, prNumber) {
  const files = await listPullFiles(github, owner, repo, prNumber);
  return getBloatFileChangeFromFiles(files);
}

function touchesSdk(files) {
  return files.some((f) => SDK_PATH_PREFIXES.some((p) => f.filename.startsWith(p)));
}

function hasManualOnlyLabel(labels) {
  return labels.some((l) => MANUAL_ONLY_LABELS.has(l));
}

function isDocsJsonAdditionsOnly(file) {
  if (file.filename !== 'docs.json') return false;
  if (file.patch && isNavOnlyDocsJsonPatch(file.patch)) return true;
  if (!file.patch && (file.deletions || 0) === 0 && (file.additions || 0) > 0) return true;
  return false;
}

function sensitivePathReasons(files, labels = []) {
  if (labels.includes(WORKFLOW_ONLY_LABEL) && isCiOnlyChange(files)) {
    return [];
  }
  const reasons = [];
  for (const f of files) {
    if (isDocsJsonAdditionsOnly(f)) continue;
    if (SENSITIVE_PATH_PATTERNS.some((p) => p.test(f.filename))) {
      reasons.push(`sensitive path: ${f.filename}`);
      break;
    }
  }
  return reasons;
}

function prSizeReasons(files) {
  const reasons = [];
  const docsPrimary = isDocsPrimaryPullRequest(files);
  const maxAdditions = docsPrimary ? DOCS_PRIMARY_MAX_ADDITIONS : PR_MAX_AUTO_ADDITIONS;
  const maxFiles = docsPrimary ? DOCS_PRIMARY_MAX_FILES : PR_MAX_AUTO_FILES;
  const totalAdditions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
  if (totalAdditions > maxAdditions) {
    reasons.push(`PR +${totalAdditions} lines (>${maxAdditions}) requires manual review`);
  }
  if (files.length > maxFiles) {
    reasons.push(`${files.length} files changed (>${maxFiles}) requires manual review`);
  }
  return reasons;
}

function missingTestsReason(files) {
  const sdkAdds = files.filter(
    (f) =>
      SDK_PATH_PREFIXES.some((p) => f.filename.startsWith(p)) &&
      f.filename.endsWith('.py') &&
      !f.filename.endsWith('__init__.py') &&
      (f.additions || 0) > 0
  );
  if (sdkAdds.length === 0) return null;
  if (isDocsPrimaryPullRequest(files)) {
    const sdkAdditions = sdkAdds.reduce((sum, f) => sum + (f.additions || 0), 0);
    if (sdkAdditions <= DOCS_PRIMARY_MAX_SDK_ADDITIONS) return null;
  }
  const hasTestChange = files.some(
    (f) => /\/tests?\//.test(f.filename) || /test_.*\.py$/.test(f.filename) || /_test\.py$/.test(f.filename)
  );
  if (!hasTestChange) return 'SDK code added without test file changes — requires manual review';
  return null;
}

function secretScanReasons(files) {
  for (const f of files) {
    if (/\/tests?\//.test(f.filename) || /test_.*\.py$/.test(f.filename)) continue;
    const patch = f.patch || '';
    if (!patch) continue;
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(patch)) {
        return [`possible secret in diff (${f.filename}) — requires manual review`];
      }
    }
  }
  return [];
}

async function sdkTestChecksReason(github, owner, repo, sha, files, core) {
  if (REQUIRED_SDK_CHECK_PATTERNS.length === 0) return null;
  if (!touchesSdk(files)) return null;
  const { data } = await github.rest.checks.listForRef({
    owner,
    repo,
    ref: sha,
    per_page: 100,
  });
  const runs = (data.check_runs || []).filter((r) => r.head_sha === sha);
  if (runs.length === 0) {
    return 'SDK code changed but no CI checks on HEAD';
  }
  const testRuns = runs.filter((r) => REQUIRED_SDK_CHECK_PATTERNS.some((p) => p.test(r.name || '')));
  if (testRuns.length === 0) {
    return 'SDK code changed but no test check runs on HEAD';
  }
  core?.info?.(`SDK test checks on HEAD: ${testRuns.map((r) => r.name).join(', ')}`);
  return null;
}

function manualReviewReasonForBloatFile(bloatChange) {
  if (!bloatChange.touched) return null;
  if (bloatChange.additions > BLOAT_FILE_MAX_AUTO_LINES) {
    return `${bloatChange.filename} +${bloatChange.additions} lines (>${BLOAT_FILE_MAX_AUTO_LINES}) requires manual review`;
  }
  return null;
}

async function listAllComments(github, owner, repo, issueNumber) {
  if (typeof github.paginate === 'function') {
    return github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });
  }
  const { data } = await github.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  return data;
}

async function getHeadCommitDate(github, owner, repo, prNumber) {
  try {
    let commits;
    if (typeof github.paginate === 'function') {
      commits = await github.paginate(github.rest.pulls.listCommits, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });
    } else {
      const { data } = await github.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });
      commits = data;
    }
    const last = commits[commits.length - 1];
    return last?.commit?.committer?.date || last?.commit?.author?.date || null;
  } catch {
    return null;
  }
}

async function loadPrContext(github, owner, repo, prNumber) {
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: prNumber });
  const comments = await listAllComments(github, owner, repo, prNumber);
  const { data: reviews } = await github.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  const mergeState = await getMergeState(github, owner, repo, prNumber);
  const headSha = mergeState.headSha || pr.head.sha;
  const headCommitDate = await getHeadCommitDate(github, owner, repo, prNumber);
  const headPushedAt = headCommitDate || pr.updated_at;

  return {
    pr,
    issue,
    comments,
    reviews,
    mergeState,
    headSha,
    headPushedAt,
    labels: issue.labels.map((l) => l.name),
    baseRepo: `${owner}/${repo}`,
  };
}

async function evaluatePipelineQuiescent(github, owner, repo, prNumber, core, options = {}) {
  const {
    forMergeStep = false,
    skipGlobalClaudeRunCheck = false,
    skipRecentClaudeCooldown = false,
  } = options;
  const ctx = await loadPrContext(github, owner, repo, prNumber);
  const reasons = [];

  if (ctx.pr.draft) reasons.push('draft');
  if (ctx.pr.state !== 'open') reasons.push('not open');
  if (ctx.labels.includes('auto-merged-by-gate')) reasons.push('already merged by gate');
  if (ctx.labels.includes('no-auto-merge')) reasons.push('no-auto-merge label');
  if (ctx.labels.includes('claude-conflict-pending')) reasons.push('claude-conflict-pending');
  if (!forMergeStep && ctx.labels.includes(MERGE_GATE_ACTIVE_LABEL)) {
    const gate = await reconcileMergeGateActiveLabel(
      github, owner, repo, prNumber, ctx.labels, core
    );
    if (gate.block) reasons.push('claude-merge-gate-active');
  }

  const { status, headRepo, maintainerCanModify } = ctx.mergeState;
  if (!ALLOWED_MERGE_STATES.has(status)) reasons.push(`mergeState=${status}`);

  if (headRepo && headRepo !== ctx.baseRepo) {
    reasons.push('fork PR');
  }

  if (hasRecentConflictComment(ctx.comments, ctx.headPushedAt)) {
    reasons.push('recent merge-conflict @claude');
  }
  if (!skipRecentClaudeCooldown && hasRecentClaudeTrigger(ctx.comments, 35)) {
    const verdictOnHead = findMergeGateVerdict(ctx.comments, null, ctx.headPushedAt) !== null;
    const finalCurrent = finalClaudeCompletedOnSha(ctx.comments, ctx.headPushedAt);
    if (!verdictOnHead && !finalCurrent) reasons.push('recent @claude within 35min');
  }

  if (!skipGlobalClaudeRunCheck && (await hasInProgressClaudeAssistant(github, owner, repo, prNumber))) {
    reasons.push('claude.yml in progress');
  }

  const checksOk = await allChecksGreenOnSha(github, owner, repo, ctx.headSha, core, {
    mergeStateStatus: ctx.mergeState.status,
  });
  if (!checksOk) reasons.push('CI not green on HEAD');

  if (!finalClaudeCompletedOnSha(ctx.comments, ctx.headPushedAt)) {
    if (!hasFinalClaudeReviewTrigger(ctx.comments)) {
      reasons.push('no FINAL Claude review trigger');
    } else if (isStaleFinalAfterPush(ctx.comments, ctx.headPushedAt)) {
      reasons.push('stale FINAL after new commits (needs @claude re-review)');
    } else {
      reasons.push('FINAL Claude not complete on HEAD');
    }
  }

  if (hasAnyChangesRequested(ctx.reviews)) reasons.push('CHANGES_REQUESTED review');

  if (hasManualOnlyLabel(ctx.labels)) {
    const manualLabel = ctx.labels.find((l) => MANUAL_ONLY_LABELS.has(l));
    reasons.push(`manual-only label: ${manualLabel}`);
  }

  const pullFiles = await listPullFiles(github, owner, repo, prNumber);

  const bloatChange = getBloatFileChangeFromFiles(pullFiles);
  const bloatManual = manualReviewReasonForBloatFile(bloatChange);
  if (bloatManual) reasons.push(bloatManual);

  reasons.push(...sensitivePathReasons(pullFiles, ctx.labels));
  reasons.push(...prSizeReasons(pullFiles));
  reasons.push(...secretScanReasons(pullFiles));

  const testsReason = missingTestsReason(pullFiles);
  if (testsReason) reasons.push(testsReason);

  const sdkCheckReason = await sdkTestChecksReason(github, owner, repo, ctx.headSha, pullFiles, core);
  if (sdkCheckReason) reasons.push(sdkCheckReason);

  if (ctx.pr.mergeable === false) reasons.push('not mergeable');

  const ready = reasons.length === 0;
  return {
    ready,
    reasons,
    headSha: ctx.headSha,
    prNumber,
  };
}

async function selectMergeGateCandidates(github, owner, repo, prNumbers, maxCandidates, core) {
  const readyList = [];
  const skipped = [];
  for (const num of prNumbers) {
    const result = await evaluatePipelineQuiescent(github, owner, repo, num, core);
    if (result.ready) {
      readyList.push({ pr_number: num, head_sha: result.headSha });
    } else {
      skipped.push({ pr: num, reasons: result.reasons });
    }
  }
  readyList.sort((a, b) => a.pr_number - b.pr_number);
  return {
    candidates: readyList.slice(0, maxCandidates),
    skipped,
  };
}

function findMergeGateVerdict(comments, minCreatedAt = null, headPushedAt = null) {
  const minTime = minCreatedAt ? new Date(minCreatedAt).getTime() : 0;
  const headTime = headPushedAt ? new Date(headPushedAt).getTime() - 60000 : 0;
  const gateComments = comments
    .filter((c) => {
      if (!(c.body || '').includes('MERGE_GATE_VERDICT:')) return false;
      const created = new Date(c.created_at).getTime();
      if (minTime && created < minTime) return false;
      if (headTime && created < headTime) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (gateComments.length === 0) return null;
  const body = gateComments[0].body || '';
  if (body.includes('MERGE_GATE_VERDICT: APPROVE')) return 'APPROVE';
  if (body.includes('MERGE_GATE_VERDICT: BLOCK')) return 'BLOCK';
  return null;
}

module.exports = {
  CLAUDE_TRIGGER_LOGINS,
  AUTO_ACTORS,
  isFinalClaudeTriggerComment,
  isClaudeTriggerNoise,
  hasRecentClaudeTrigger,
  hasRecentConflictComment,
  isConflictRebaseTriggerComment,
  isConflictRebaseCompletionComment,
  conflictRebaseQuiescent,
  hasHumanChangesRequested,
  hasAnyChangesRequested,
  hasFinalClaudeReviewTrigger,
  finalClaudeCompletedOnSha,
  getMergeState,
  allChecksGreenOnSha,
  hasInProgressClaudeAssistant,
  claudeRunBlocksPr,
  hasBlockingClaudeRunForPr,
  isCiOnlyChange,
  isInternalPullRequestLink,
  resolvePrNumberFromLinkedPullRequests,
  resolvePrNumberFromHeadBranch,
  resolvePrNumberFromWorkflowRun,
  WORKFLOW_ONLY_LABEL,
  getBloatFileChange,
  getBloatFileChangeFromFiles,
  manualReviewReasonForBloatFile,
  listPullFiles,
  touchesSdk,
  hasManualOnlyLabel,
  sensitivePathReasons,
  isDocsJsonAdditionsOnly,
  isNavOnlyDocsJsonPatch,
  isDocsPrimaryPullRequest,
  extractDocsNavPath,
  prSizeReasons,
  missingTestsReason,
  secretScanReasons,
  sdkTestChecksReason,
  listAllComments,
  getHeadCommitDate,
  isStaleFinalAfterPush,
  needsStaleFinalRecovery,
  shouldSkipFinalRecovery,
  shouldSkipStaleFinalRecovery,
  isClaudeAutomationLogin,
  isPushSoonAfterLatestFinal,
  FINAL_CLAUDE_REVIEW_BODY,
  loadPrContext,
  evaluatePipelineQuiescent,
  selectMergeGateCandidates,
  findMergeGateVerdict,
  MERGE_GATE_ACTIVE_LABEL,
  MERGE_GATE_ACTIVE_STALE_MS,
  mergeGateJobTargetsPr,
  shouldBlockOnMergeGateActiveLabel,
  hasInProgressMergeGateForPr,
  reconcileMergeGateActiveLabel,
};
