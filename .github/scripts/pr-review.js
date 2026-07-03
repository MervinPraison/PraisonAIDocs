/**
 * PR reverification without external review bots (CodeRabbit/Qodo/Copilot).
 * @see .github/workflows/auto-pr-comment.yml, claude.yml
 */

const mergeGate = require('./merge-gate.js');

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

function hasRecentFinalTrigger(comments, minutes = 10) {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return comments.some((c) => {
    if (!mergeGate.AUTO_ACTORS.includes(c.user.login)) return false;
    if (!mergeGate.isFinalClaudeTriggerComment(c)) return false;
    return new Date(c.created_at).getTime() > cutoff;
  });
}

async function postFinalClaudeReviewIfNeeded(github, owner, repo, prNumber, core, options = {}) {
  const { resyncOnly = false, force = false } = options;
  const ctx = await mergeGate.loadPrContext(github, owner, repo, prNumber);
  const comments = ctx.comments;

  if (force) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: mergeGate.FINAL_CLAUDE_REVIEW_BODY,
    });
    return { posted: true, reason: 'forced' };
  }

  if (hasRecentFinalTrigger(comments)) {
    return { posted: false, reason: 'recent_final' };
  }

  if (resyncOnly) {
    if (!mergeGate.hasFinalClaudeReviewTrigger(comments)) {
      return { posted: false, reason: 'no_final_yet' };
    }
    if (!mergeGate.needsStaleFinalRecovery(comments, ctx.headPushedAt)) {
      return { posted: false, reason: 'final_current' };
    }
  } else if (mergeGate.hasFinalClaudeReviewTrigger(comments)) {
    return { posted: false, reason: 'final_exists' };
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: mergeGate.FINAL_CLAUDE_REVIEW_BODY,
  });
  return { posted: true, reason: resyncOnly ? 'stale_resync' : 'opened' };
}

async function findOpenPrForIssue(github, owner, repo, issueNumber) {
  const prefixes = [`claude/issue-${issueNumber}-`, 'claude/'];
  const { data: prs } = await github.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    sort: 'created',
    direction: 'desc',
    per_page: 30,
  });
  return (
    prs.find((p) => {
      const ref = p.head?.ref || '';
      return prefixes.some((prefix) => ref.startsWith(prefix));
    }) || null
  );
}

async function triggerFinalReviewForIssue(github, owner, repo, issueNumber, core) {
  const pr = await findOpenPrForIssue(github, owner, repo, issueNumber);
  if (!pr) {
    core?.info?.(`No open claude PR for issue #${issueNumber}`);
    return { posted: false, reason: 'no_pr' };
  }
  const result = await postFinalClaudeReviewIfNeeded(github, owner, repo, pr.number, core);
  return { ...result, prNumber: pr.number };
}

module.exports = {
  listAllComments,
  postFinalClaudeReviewIfNeeded,
  findOpenPrForIssue,
  triggerFinalReviewForIssue,
};
