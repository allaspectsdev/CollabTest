# CollabTest -- Project Context for Claude Code

## Project Overview

CollabTest is a greenfield project for testing two-developer collaboration workflows with Claude Code.
Developers: Ryan Decker and Bryan. Both use Claude Code extensively.

## Stack & Conventions

- **Language**: TypeScript (Node.js)
- **Package Manager**: npm
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Git Flow**: Feature branches via worktrees, PR-based merges to main

## Rules

- Never push directly to `main`. Always open a PR.
- All PRs require at least one human review before merge.
- Write tests for any new functionality.
- Keep commits atomic and well-described.
- Use conventional commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## CI Context

When running in GitHub Actions (via @claude):
- You are running in a CI environment, not a local dev machine.
- Never force-push or push directly to main.
- Always create a new branch for changes.
- Run tests before opening a PR.
- Post clear summaries of what you changed and why.

## Module Boundaries

- `src/` -- Application source code
- `tests/` -- Test files (mirror the src/ structure)
- `.claude/commands/` -- Shared custom Claude Code commands
- `.github/workflows/` -- CI/CD pipelines

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Common Commands

```bash
# Install dependencies
npm install

# Lint
npm run lint

# Format
npm run format
```
