/**
 * Idempotent CodeRabbit/Qodo kick for bot-opened PRs.
 * @see .github/workflows/auto-pr-comment.yml, claude.yml
 */

const KICK_AUTHORS = new Set(['MervinPraison', 'github-actions[bot]']);

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

function kickAuthored(comment, marker) {
  return KICK_AUTHORS.has(comment.user?.login) && (comment.body || '').includes(marker);
}

function coderabbitKickPosted(comments) {
  return comments.some((c) => kickAuthored(c, '@coderabbitai review'));
}

function qodoKickPosted(comments) {
  return comments.some((c) => kickAuthored(c, '/review'));
}

async function kickReviewChain(github, owner, repo, prNumber, core, preFetchedComments = null) {
  const comments = preFetchedComments || (await listAllComments(github, owner, repo, prNumber));
  const needCoderabbit = !coderabbitKickPosted(comments);
  const needQodo = !qodoKickPosted(comments);

  if (!needCoderabbit && !needQodo) {
    core?.info?.(`Review chain already kicked on PR #${prNumber}`);
    return { kicked: false, reason: 'already_kicked' };
  }

  if (needCoderabbit) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: '@coderabbitai review',
    });
  }
  if (needQodo) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: '/review',
    });
  }
  core?.info?.(`Kicked review chain for PR #${prNumber}`);
  return { kicked: true, coderabbit: needCoderabbit, qodo: needQodo };
}

async function findOpenPrForIssue(github, owner, repo, issueNumber) {
  const prefix = `claude/issue-${issueNumber}-`;
  const { data: prs } = await github.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    sort: 'created',
    direction: 'desc',
    per_page: 30,
  });
  return prs.find((p) => (p.head?.ref || '').startsWith(prefix)) || null;
}

async function kickReviewChainForIssue(github, owner, repo, issueNumber, core) {
  const pr = await findOpenPrForIssue(github, owner, repo, issueNumber);
  if (!pr) {
    core?.info?.(`No open PR for issue #${issueNumber}, skipping review kick`);
    return { kicked: false, reason: 'no_pr' };
  }
  const result = await kickReviewChain(github, owner, repo, pr.number, core);
  return { ...result, prNumber: pr.number };
}

module.exports = {
  kickReviewChain,
  kickReviewChainForIssue,
  findOpenPrForIssue,
};
