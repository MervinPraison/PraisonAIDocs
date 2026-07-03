/**
 * Ensure claude/issue-{N}-* branches have an open PR (CI fallback when Claude skips gh pr create).
 * @see .github/workflows/claude.yml, bot-pr-recovery.yml
 */

const ISSUE_BRANCH_PREFIX = (issueNumber) => `claude/issue-${issueNumber}-`;

function prTitleFromIssue(issue) {
  const title = (issue.title || '').trim();
  if (!title) return 'docs: update documentation';
  if (title.toLowerCase().startsWith('docs:')) return title;
  return `docs: ${title}`;
}

async function listClaudeBranchesForIssue(github, owner, repo, issueNumber) {
  const prefix = ISSUE_BRANCH_PREFIX(issueNumber);
  let all;
  if (typeof github.paginate === 'function') {
    all = await github.paginate(github.rest.repos.listBranches, {
      owner,
      repo,
      per_page: 100,
    });
  } else {
    const { data } = await github.rest.repos.listBranches({ owner, repo, per_page: 100 });
    all = data;
  }
  return all
    .map((b) => b.name)
    .filter((name) => name.startsWith(prefix))
    .sort()
    .reverse();
}

async function findOpenPrForBranch(github, owner, repo, branchName) {
  const { data: prs } = await github.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    head: `${owner}:${branchName}`,
    per_page: 5,
  });
  return prs[0] || null;
}

async function findOpenPrForIssue(github, owner, repo, issueNumber) {
  const prefix = ISSUE_BRANCH_PREFIX(issueNumber);
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

async function createPrForBranch(github, owner, repo, issueNumber, branchName, issue) {
  const { data: pr } = await github.rest.pulls.create({
    owner,
    repo,
    title: prTitleFromIssue(issue),
    head: branchName,
    base: 'main',
    body: `Fixes #${issueNumber}`,
  });
  return pr;
}

async function ensureOpenPrForIssue(github, owner, repo, issueNumber, core) {
  const existing = await findOpenPrForIssue(github, owner, repo, issueNumber);
  if (existing) {
    core?.info?.(`Issue #${issueNumber} already has open PR #${existing.number}`);
    return { created: false, reason: 'pr_exists', prNumber: existing.number };
  }

  const branches = await listClaudeBranchesForIssue(github, owner, repo, issueNumber);
  if (branches.length === 0) {
    core?.info?.(`Issue #${issueNumber}: no claude/issue-${issueNumber}-* branch found`);
    return { created: false, reason: 'no_branch' };
  }

  const branch = branches[0];
  const openOnBranch = await findOpenPrForBranch(github, owner, repo, branch);
  if (openOnBranch) {
    return { created: false, reason: 'pr_exists', prNumber: openOnBranch.number, branch };
  }

  const { data: issue } = await github.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  try {
    const pr = await createPrForBranch(github, owner, repo, issueNumber, branch, issue);
    core?.info?.(`Created PR #${pr.number} for ${branch} (issue #${issueNumber})`);
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: [
        '🔧 **CI opened missing PR** — Claude pushed commits but no pull request was found.',
        '',
        `[#${pr.number}](${pr.html_url}) · branch \`${branch}\``,
      ].join('\n'),
    });
    return { created: true, prNumber: pr.number, branch };
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('already exists') || err?.status === 422) {
      core?.info?.(`PR already exists for ${branch}: ${msg}`);
      return { created: false, reason: 'already_exists', branch };
    }
    throw err;
  }
}

async function recoverOrphanBranches(github, owner, repo, options, core) {
  const { issueNumber = null, maxRecover = 10 } = options || {};
  let created = 0;

  if (issueNumber) {
    const result = await ensureOpenPrForIssue(github, owner, repo, issueNumber, core);
    return result.created ? 1 : 0;
  }

  const { data: issues } = await github.rest.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    labels: 'claude',
    per_page: 100,
  });

  for (const issue of issues) {
    if (created >= maxRecover) break;
    if (issue.pull_request) continue;
    const result = await ensureOpenPrForIssue(github, owner, repo, issue.number, core);
    if (result.created) created += 1;
  }

  core?.info?.(`Orphan PR recovery complete (${created} PR(s) created)`);
  return created;
}

module.exports = {
  ISSUE_BRANCH_PREFIX,
  prTitleFromIssue,
  listClaudeBranchesForIssue,
  findOpenPrForBranch,
  findOpenPrForIssue,
  ensureOpenPrForIssue,
  recoverOrphanBranches,
};
