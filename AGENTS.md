# Project Instructions

## Language
- Write project documentation, README files, code comments, and technical descriptions in English.
- Communicate with the user in the language they use.

## Task and Git Workflow
- Before implementation, inspect the current branch, working tree, and relevant open pull requests when GitHub access is available.
- Decide whether the request continues the current task or starts an independent task. Base this on the requested changes, the branch purpose, and the scope of any existing pull request; a new prompt alone does not mean a new task.
- For a continuation, keep using the current task's branch and pull request.
- For an independent task, use a descriptive branch based on the appropriate base. Reuse an existing branch or pull request only when it clearly belongs to that task.
- Do not mix unrelated changes or create duplicate branches or pull requests.
- After the first meaningful implementation commit for a task, create a non-draft pull request ready for review if one does not already exist and GitHub access is available. Update the existing pull request as the work continues.
- Run relevant checks before creating or updating a pull request. Never merge a pull request automatically.
- Only the repository owner, Ivo, may approve and merge pull requests. Codex must never submit approving reviews, merge pull requests, or enable automatic merging.

## Task Switching and Work Preservation
- Inspect the working tree before switching tasks. Never discard, overwrite, or commit uncommitted work just to switch tasks.
- If the new request continues the current task, continue on its branch.
- If it is independent and the current checkout has unfinished work, leave that work untouched in its current checkout and start the new task in a separate Git worktree from the appropriate base, when worktrees are available.
- A new worktree does not include uncommitted changes from another checkout. Do not imply that those changes were transferred.
- Never stash, reset, clean, or force-push without the user's explicit approval.
- Never modify another task's worktree.
- If a separate worktree cannot be created safely, explain the situation and ask the user how to proceed.
- If task classification is genuinely ambiguous, ask before creating or switching branches.

See [docs/development-workflow.md](docs/development-workflow.md) for the detailed workflow.
