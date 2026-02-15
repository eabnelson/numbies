# /create-prd - Create a Thorough Product Requirements Document

Guide the user through creating a comprehensive PRD with implementation tracking, then save it to `/docs`.

## PRD Naming Convention

Files are named: `PRD-{NNN}-{slug}.md`
- NNN is a 3-digit incrementing index (001, 002, 003...)
- Slug is a short kebab-case description
- Example: `PRD-001-qr-scanner-contacts.md`, `PRD-002-user-profiles.md`

To find the next index:
```bash
ls docs/PRD-*.md 2>/dev/null | sort -r | head -1 | grep -o 'PRD-[0-9]*' | grep -o '[0-9]*'
```
If no PRDs exist, start with 001. Otherwise, increment the highest number.

## Steps

### 1. Gather Feature Overview
Ask the user:
- What feature do you want to build?
- What problem does it solve?

### 2. Ask Clarifying Questions
Before writing anything, ask questions to understand:
- **UI/UX**: Where does this feature live? What does it look like?
- **User flows**: What are the step-by-step interactions?
- **Edge cases**: What happens when things go wrong?
- **Technical constraints**: Any specific libraries, APIs, or patterns to use?
- **Testing**: How will this be tested locally? (localhost, Tailscale, etc.)

Keep asking until you have enough detail. Don't guess - clarify.

### 3. Research the Codebase
Read relevant existing files to understand:
- Current patterns and conventions
- Related components that will be modified
- Database schema if applicable
- Auth/state management patterns

### 4. Write the PRD
Create a comprehensive document with these sections:

```markdown
# {Feature Name} PRD

## Overview
Brief description of the feature and why it's needed.

## Problem Statement
What problem does this solve?

## Goals
Numbered list of specific goals.

---

## Feature Specifications
Detailed specs for each part of the feature.
Include subsections as needed (### 1.1, ### 1.2, etc.)

---

## Technical Considerations
- Libraries to use
- Platform differences (web vs native)
- Performance considerations

---

## Implementation Tasks & Status

> **Instructions:** After completing each task, update its status from `[ ]` to `[x]` and add completion notes if relevant.

### Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[-]` Skipped/Not needed

---

### Phase 1: {Phase Name}

#### Task 1.1: {Task Name}
- **Status:** `[ ]`
- **Scope:** {What fits in one Claude context window}
- **Steps:**
  1. Step one
  2. Step two
- **Files:** `path/to/file.ts`
- **Completion notes:**

{Continue with more tasks...}

---

## Progress Summary

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| 1. {Name} | X | 0 | Not started |
| **Total** | **X** | **0** | **0%** |

---

## Development & Testing Configuration
- Local dev URL
- Tailscale/tunnel URL
- Production URL
- Testing checklist

---

## UI/UX Specifications
Colors, icons, animations, etc.

---

## Error States
Table of error scenarios and messages.

---

## Open Questions
Any unresolved decisions.

---

## Appendix: File Changes Summary

### New Files
- List of new files to create

### Modified Files
- List of existing files to modify
```

### 5. Task Requirements
Each task MUST:
- Fit in a single Claude context window
- Have clear, numbered steps
- List specific files to modify
- Be independently completable
- Have a status checkbox

### 6. Save the PRD
1. Find the next available index number
2. Save to `/docs/PRD-{NNN}-{slug}.md`

### 7. Confirm with User
Show the user:
- The PRD file path
- Total number of tasks
- Ask if they want to adjust anything before starting implementation

## Tips for Good PRDs
- Be specific, not vague
- Include code snippets for complex logic
- Reference existing patterns in the codebase
- Break large tasks into smaller ones (max 5-7 steps per task)
- Include testing tasks at the end
