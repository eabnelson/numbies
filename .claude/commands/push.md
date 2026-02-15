# /push - Stage, Commit, and Push Changes

Stage all changes, create a commit with a concise one-line message, and push to remote.

## Steps

1. Check for changes with `git status`. If no changes, inform the user and stop.

2. Review the diff to understand what changed with `git diff` and `git diff --cached`.

3. Stage all changes with `git add .`

4. Create a commit with a concise one-line message:
   - Summarize the changes in one line
   - Use conventional commit style (feat:, fix:, chore:, etc.)
   - Keep it under 72 characters

5. Push to remote with `git push`

6. Report the commit hash and confirm the push was successful.
