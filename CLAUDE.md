# CollabTest — Project Context for Claude Code

## Project Overview

CollabTest is a greenfield project for testing two-developer collaboration workflows with Claude Code.
Developers: Ryan Decker (`allaspectsdev`) and Bryan (`dariuskerpro`). Both use Claude Code extensively.

## Stack & Conventions

- **Language**: TypeScript (Node.js, ES modules)
- **Package Manager**: npm
- **Testing**: Vitest
- **Linting**: ESLint (flat config) + Prettier
- **Git Flow**: Feature branches, PR-based merges to main. See CONTRIBUTING.md.

## Rules

- Never push directly to `main`. Always open a PR.
- All PRs require at least one human review before merge.
- Write tests for any new functionality.
- Keep commits atomic. Use conventional commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- PRs should target under 300 lines of non-test code. Break larger work into stacked PRs.
- Any PR that introduces a new pattern must update this file in the same PR.

## Architecture Decisions

<!-- Log significant choices here so both devs' Claude sessions stay aligned -->

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-29 | In-memory data store for now | TaskManager uses a Map. Persistence layer TBD — discuss before adding. |
| 2026-03-29 | Explicit state machine for task transitions | Valid transitions are enforced (e.g., `done` can only go back to `todo`). |
| 2026-03-29 | Immutable returns | All public methods return copies, not references to internal state. |

## Module Ownership

<!-- "Owner" = primary point of contact, not exclusive access. Anyone can contribute anywhere. -->

| Module | Owner | Notes |
|--------|-------|-------|
| `src/task-manager.ts` | Ryan | Initial implementation in PR #2 |
| `src/validators.ts` | Ryan | Input validation layer |

## Error Handling

- **Throw errors** for invalid input and not-found cases.
- Use descriptive error messages that include the relevant ID or value.
- Custom error classes (e.g., `ValidationError`) where it aids programmatic handling.
- No silent failures — if something's wrong, surface it.

## Dependencies

- **Discuss before adding new runtime dependencies.** Open an issue or comment on the relevant PR.
- Dev dependencies (testing, linting, formatting) can be added freely.
- Prefer the standard library over external packages when reasonable.

## Module Boundaries

- `src/` — Application source code
- `tests/` — Test files (mirror the `src/` structure)
- `.claude/commands/` — Shared custom Claude Code commands
- `.github/workflows/` — CI/CD pipelines

## CI Context

When running in GitHub Actions (via @claude):
- You are running in a CI environment, not a local dev machine.
- Never force-push or push directly to main.
- Always create a new branch for changes.
- Run tests before opening a PR.
- Post clear summaries of what you changed and why.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Common Commands

```bash
npm install           # Install dependencies
npm run build         # Compile TypeScript
npm run lint          # Lint
npm run format        # Format
npm run format:check  # Check formatting without writing
```
