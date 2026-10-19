---
title: Parallel work with Git worktrees
---

# Parallel work with Git worktrees

If you work on several branches or pull requests at the same time, you don't need multiple clones of dash.js.
[Git worktrees](https://git-scm.com/docs/git-worktree) let one clone have several working directories. Each one has
its own branch checked out, and all of them share the same history, objects and remotes.

This is especially useful when you run more than one AI coding agent (for example
[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)) on the same repository. Each agent works in its own
directory, so they cannot overwrite each other's files.

## Prerequisites

* A clone of dash.js
* Git 2.17 or newer
* The [GitHub CLI](https://cli.github.com/) (`gh`), if you want to push changes back to a pull request
* Optional: [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)

## One-time setup

Keep worktree folders out of `git status` by adding them to your local exclude file:

```bash
echo ".claude/worktrees/" >> .git/info/exclude
```

## Working on two pull requests in parallel

The examples below use pull requests `1234` and `5678`. Replace them with the numbers you want to work on.

### Option 1: Review only (Claude Code built-in)

Use this if you want to read, test or review the pull requests, but don't need to push commits to them.

Terminal 1:

```bash
cd ~/dev/dash.js
claude -w "#1234"
```

Terminal 2:

```bash
cd ~/dev/dash.js
claude -w "#5678"
```

Claude Code fetches each pull request, creates a worktree in `.claude/worktrees/pr-1234` or
`.claude/worktrees/pr-5678`, and starts a session inside it. When you exit a session, Claude Code removes the
worktree automatically if nothing changed and asks you what to do if there are changes.

::: warning
This option checks out `pull/<number>/head`, which is not linked to the contributor's branch. A `git push` from this
worktree does not update the pull request. Use Option 2 if you want to push changes.
:::

### Option 2: Push changes back to the pull request

Use the GitHub CLI inside a worktree you create yourself. `gh pr checkout` sets up the branch to track the
contributor's fork, so a regular `git push` updates the pull request.

Terminal 1:

```bash
cd ~/dev/dash.js
git worktree add --detach .claude/worktrees/pr-1234
cd .claude/worktrees/pr-1234
gh pr checkout 1234
npm ci
claude
```

Terminal 2:

```bash
cd ~/dev/dash.js
git worktree add --detach .claude/worktrees/pr-5678
cd .claude/worktrees/pr-5678
gh pr checkout 5678
npm ci
claude
```

::: tip
If `npm ci` fails with `ENOTDIR: not a directory, mkdir '.../.git/hooks'`, the pull request branch is based on an
older version of dash.js. Its `githook.cjs` does not support worktrees yet. Run `npm ci --ignore-scripts` instead. This
skips the pre-commit hook setup. Commits still use the hook from your main clone, so make sure you ran `npm ci` there
on a current `development` branch to install the worktree-compatible version.
:::

Pushing to a contributor's fork only works if they enabled **Allow edits by maintainers** on the pull request.

You can skip the `claude` step and use these worktrees with any editor or agent. Open the worktree folder as its own
project.

## Fixing an issue that has no pull request yet

The example below starts a fix for issue `4321` on a new branch, based on the latest `development` branch. Replace the
issue number and branch name with your own.

### 1. Create the branch and worktree

```bash
cd ~/dev/dash.js
git fetch origin
git worktree add --no-track -b fix/issue-4321 .claude/worktrees/issue-4321 origin/development
cd .claude/worktrees/issue-4321
npm ci
```

`--no-track` keeps the new branch from tracking `origin/development`, so the first push creates a new branch on the
remote instead of targeting `development`.

### 2. Work on the fix

Start an agent in the worktree:

```bash
claude
```

Then describe the task, for example:

```text
Read issue #4321 with `gh issue view 4321` and fix it. Add a unit test that reproduces the problem,
then run `npm run lint` and `npm run test`.
```

You can run this in parallel with the pull request worktrees above. Each agent stays in its own folder.

### 3. Push and open a pull request

Commit your changes, then push the branch and open a pull request against `development`:

```bash
git push -u origin fix/issue-4321
gh pr create --base development --title "Fix #4321: <short description>" --body "Fixes #4321"
```

If you work from a fork, push to your fork's remote instead of `origin`. `gh pr create` asks where to open the pull
request if it can't tell.

After this, the worktree behaves like the ones in Option 2: a plain `git push` from the folder updates the pull request.

## Working on your own existing branches

Branches you already have work the same way:

```bash
cd ~/dev/dash.js
git worktree add .claude/worktrees/feature-x feature/x
cd .claude/worktrees/feature-x
npm ci
claude
```

## Things to know

* **Dependencies:** `node_modules` is not shared between worktrees. Run `npm ci` once in every new worktree before
  building or running tests.
* **Dev server:** `npm run start` uses an automatically selected port, so you can run the dev server in several
  worktrees at the same time.
* **One branch per worktree:** Git does not allow the same branch to be checked out in two worktrees. This prevents two
  agents from changing the same branch at once.
* **Merge conflicts still happen:** Worktrees keep the files apart while you work. If two branches change the same
  code, you still have to resolve conflicts when merging.

## Cleaning up

List all worktrees:

```bash
git worktree list
```

Remove the ones you no longer need from the main clone:

```bash
cd ~/dev/dash.js
git worktree remove .claude/worktrees/pr-1234
git worktree remove .claude/worktrees/pr-5678
git worktree prune
```

`git worktree remove` refuses to delete a worktree with uncommitted changes. Add `--force` only if you want to discard
them.

Branches created by `gh pr checkout` stay in your clone after the worktree is removed. Delete them with
`git branch -D <branch-name>` if you no longer need them.
