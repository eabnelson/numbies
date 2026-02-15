# /check - Run Type and Lint Checks

Run type checking and linting to verify code quality.

## Steps

1. Run TypeScript type checking:
   ```bash
   bun run typecheck
   ```

2. Run Biome lint check:
   ```bash
   bunx biome check .
   ```

3. Report results:
   - If both pass, report success
   - If either fails, show the errors and suggest fixes
