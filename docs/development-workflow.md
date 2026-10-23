# Development Workflow

This document describes how Codex should organize independent tasks and continuations in this repository.

## Classify the Request

Before changing files:

1. Inspect the current branch and working tree.
2. When GitHub access is available, check for an open pull request related to the current branch or requested work.
3. Decide whether the request continues the branch's existing task or starts independent work. Consider the requested changes, current implementation, branch purpose, and pull request scope. Do not treat each new prompt as a new task automatically.
4. If the distinction is genuinely unclear, ask the user before changing branches.

## Continue Existing Work

- Keep working on the existing task branch and pull request.
- Make new commits on that branch.
- Update the pull request description when the scope changes materially.
- Do not create a duplicate branch or pull request.

## Start Independent Work

- Use a descriptive branch from the appropriate base. Follow the repository's existing branch naming conventions; otherwise use a type prefix such as `feature/`, `fix/`, or `chore/`.
- Keep unrelated changes in separate branches.
- After the first meaningful implementation commit, create a non-draft pull request ready for review if one does not already exist and GitHub access is available.
- Continue updating that pull request, and run relevant checks before creating or updating it.
- Never merge a pull request automatically.

## Pull Request Approval and Merge Ownership

- Only the repository owner, Ivo, may approve and merge pull requests.
- Codex may create branches, commit and push task changes, open non-draft pull requests, update their descriptions, and run checks.
- Codex must never submit approving reviews, merge pull requests, or enable automatic merging. After preparing the pull request, leave approval and merging to Ivo.
- This ownership rule applies even after all checks pass or a pull request is marked ready for review.

## Preserve Unfinished Work When Switching Tasks

- Inspect and identify uncommitted changes before switching.
- If they belong to the current task, keep them intact in their current checkout.
- For an independent task, start work in a separate Git worktree when available. A new worktree starts from a commit and does not carry over uncommitted changes from the original checkout.
- Never commit unrelated or incomplete changes just to make switching easier.
- Never stash, reset, clean, force-push, or overwrite another task's work without the user's explicit approval.
- Never modify a worktree that belongs to another task.
- If safe isolation is not possible, stop before switching and ask the user how to proceed.

## Documentation and Communication

- Write repository documentation, README files, code comments, and technical descriptions in English.
- Communicate with the user in their preferred language.

## Limits of Repository Instructions

These instructions guide Codex but do not enforce GitHub permissions or repository policy. Use GitHub rulesets and CI checks when a rule must be enforced for every contributor. Create pull requests only when the required GitHub access is available.
