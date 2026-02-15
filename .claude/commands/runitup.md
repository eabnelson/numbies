# /runitup - Implement the Most Recent PRD

Find the most recent PRD in `/docs`, identify the next incomplete task, and implement it.

## Steps

### 1. Find the Most Recent PRD
```bash
ls -1 docs/PRD-*.md | sort -r | head -1
```
PRDs are named `PRD-{NNN}-{slug}.md` so sorting in reverse gives the highest index (most recent).

### 2. Read the PRD
Read the entire PRD file to understand:
- The overall feature being built
- The current progress (check the Progress Summary table)
- All task statuses

### 3. Find the Next Task
Scan through the Implementation Tasks section and find the first task with status `[ ]` (not started).

If a task is marked `[~]` (in progress), continue that task instead.

### 4. Announce the Task
Tell the user:
- Which task you're starting (e.g., "Task 2.1: Add Contacts Table to Schema")
- What files will be modified
- Brief summary of what you'll do

### 5. Implement the Task
Follow the task's steps exactly:
1. Read any files mentioned in the task
2. Make the required changes
3. Run any commands specified (like `npx convex dev`)

### 6. Verify the Implementation
- Check for TypeScript errors if code was written
- Run any relevant tests or checks
- Ensure the changes work as expected

### 7. Update the PRD
After completing the task, update the PRD file:

1. Change the task status from `[ ]` to `[x]`
2. Add completion notes if relevant (issues encountered, decisions made)
3. Update the Progress Summary table:
   - Increment the "Completed" count for that phase
   - Update the percentage

Example status update:
```markdown
#### Task 2.1: Add Contacts Table to Schema
- **Status:** `[x]`
- **Completion notes:** Added contacts table with userId, address, note, avatarUrl fields. Schema deployed successfully.
```

### 8. Report Completion & Assess Continuation
Tell the user:
- What was completed
- Any issues or decisions made
- Current overall progress (X/Y tasks complete)

**Then decide whether to continue:**

If the task was **small** (e.g., schema change, config update, single-file edit with minimal exploration):
- Announce: "Context is still fresh. Continuing to next task..."
- Go back to Step 3 and start the next task

If the task was **medium to large** (e.g., multiple files edited, significant code written, lots of file exploration):
- Announce the next task as a preview
- STOP and let the user run `/runitup` again

**Indicators of a "small" task:**
- Less than ~5 file reads/edits total
- Single component or function added
- Mostly configuration or schema work
- No complex debugging or iteration needed

**Indicators to stop:**
- 10+ files read or edited
- Significant new feature code written
- Multiple components created
- Debugging or troubleshooting required
- You're uncertain about the next task's scope

## Important Rules

1. **Continue when fresh, stop when full** - Keep going on small tasks, stop after larger ones to preserve context quality.
2. **Follow the PRD exactly** - Don't improvise or add features not in the spec
3. **Update status immediately** - Mark tasks complete right after finishing each task
4. **Document issues** - If something doesn't work as expected, note it in completion notes
5. **Don't skip tasks** - Tasks are ordered for a reason (dependencies)
6. **Err on the side of stopping** - If unsure whether to continue, stop. Fresh context is better than exhausted context.

## If No PRD Exists
If no PRD files are found in `/docs`, tell the user:
"No PRD found. Run `/create-prd` first to create one."

## If All Tasks Complete
If all tasks are marked `[x]`, tell the user:
"All tasks in {PRD name} are complete! The feature is ready for final testing."

## Example Flow

**Small tasks (continue):**
```
Task 1.1: Add schema field → Done ✓ (2 files touched)
"Context fresh, continuing..."
Task 1.2: Add mutation → Done ✓ (1 file touched)
"Context fresh, continuing..."
Task 2.1: Create component → Done ✓ (4 files touched)
"Stopping here. Next: Task 2.2"
```

**Large task (stop):**
```
Task 3.1: Implement send flow → Done ✓ (12 files touched, new screen + hooks)
"Stopping here. Next: Task 3.2"
```
