# CollabTest

**A greenfield project for testing two-developer collaboration workflows powered by Claude Code.**

> From Ryan Decker to Bryan -- March 2026

---

## What Is This?

CollabTest is a purpose-built repository for exploring and validating best practices when two developers both use **Claude Code** extensively on a shared codebase. It serves as both a living experiment and a reference implementation for the patterns described below.

The goal: figure out the smoothest possible two-person workflow using Claude Code's latest capabilities -- worktree isolation, agent teams, GitHub Actions integration, shared configuration -- and document what works.

---

## Table of Contents

- [Quick Start](#quick-start)
- [1. Shared CLAUDE.md -- The Foundation](#1-shared-claudemd----the-foundation)
- [2. Git Worktrees for Parallel Work](#2-git-worktrees-for-parallel-work)
- [3. @claude on GitHub for Async Handoffs](#3-claude-on-github-for-async-handoffs)
- [4. Agent Teams for Complex Features](#4-agent-teams-for-complex-features)
- [5. Subagent Worktree Isolation](#5-subagent-worktree-isolation)
- [6. Shared Skills and Custom Commands](#6-shared-skills-and-custom-commands)
- [7. Recommended Daily Workflow](#7-recommended-daily-workflow)
- [Project Structure](#project-structure)
- [Setup Checklist](#setup-checklist)
- [Contributing](#contributing)

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/allaspectsdev/CollabTest.git
cd CollabTest

# Start Claude Code in a worktree for your feature
claude --worktree your-feature-name

# Or launch in a tmux pane
claude --worktree your-feature-name --tmux
```

---

## 1. Shared CLAUDE.md -- The Foundation

The single most important thing for team collaboration with Claude Code is a **shared `CLAUDE.md`** file versioned in the Git repository. Every team member gets the same context and instructions, keeping Claude's behavior consistent regardless of who's prompting.

### Three Configuration Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| **Personal** | `~/.claude/CLAUDE.md` | Individual preferences (model defaults, formatting quirks) |
| **Project** | `CLAUDE.md` at repo root (committed) | Architecture decisions, stack conventions, test commands, module boundaries |
| **Team** | Optional team-level config | Scales beyond two people if needed |

### What to Encode

- Preferred frameworks, ORMs, and libraries
- Monorepo tooling and build conventions
- Testing patterns and required test coverage
- Module boundaries and ownership
- Code style preferences beyond what linters enforce
- Deployment and CI/CD conventions

Both developers running Claude Code on the same repo will get **identical context loading** from the project-level `CLAUDE.md`.

---

## 2. Git Worktrees for Parallel Work

This is the killer feature for our setup. Git worktrees create separate working directories, each with their own files and branch, while sharing the same repository history and remote connections. Claude Code has **built-in worktree support** (shipped February 2026).

```bash
# Ryan works on the API layer
claude --worktree feature-api-refactor

# Bryan works on the frontend
claude --worktree feature-dashboard-ui

# Add --tmux to launch in its own tmux pane
claude --worktree feature-auth --tmux
```

### Key Behaviors

- If you exit a worktree session with **no changes**, the worktree and its branch are removed automatically
- If edits exist, the worktree persists with the branch name, ready for review and merge
- Teams using this pattern report only ~3% conflict rate across parallel sessions (as long as work targets non-overlapping files)

### Manual Worktree Control

For more control over branch naming or base branch:

```bash
git worktree add ../CollabTest-feature-a -b feature-a
cd ../CollabTest-feature-a && claude
```

---

## 3. @claude on GitHub for Async Handoffs

Install the Claude GitHub App by running `/install-github-app` from your Claude Code terminal. This sets up Anthropic's official GitHub Action (`anthropics/claude-code-action@v1`) which runs Claude Code inside GitHub Actions runners with full access to the repo.

### How It Works

1. Either developer tags `@claude` on an issue or PR comment
2. Claude picks it up in CI -- reads the repo, analyzes diffs, posts findings
3. For issues: Claude creates a branch, makes the fix, runs tests, opens a PR
4. For PRs: Claude reviews code, suggests improvements, catches bugs

### Async Collaboration Pattern

```
Ryan opens an issue --> tags @claude --> Claude produces a PR --> Bryan reviews it
```

No one had to pull the repo, switch branches, or spin up a dev environment for small fixes.

### Setup Requirements

1. Add `ANTHROPIC_API_KEY` to repository secrets
2. Copy the workflow YAML into `.github/workflows/`
3. Grant appropriate permissions: `contents: write`, `pull-requests: write`
4. Add a CI-specific section to `CLAUDE.md` so Claude knows to **never push directly to main**

---

## 4. Agent Teams for Complex Features

Agent teams (shipped with Opus 4.6) let you coordinate multiple Claude Code instances working together. One session acts as the **team lead**, coordinating work and assigning tasks. Teammates work independently, each in its own context window, and communicate directly through a shared task list and messaging system.

```bash
# Enable agent teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Or add to .claude/settings.json:
# { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

### How Agent Teams Differ from Subagents

| | Subagents | Agent Teams |
|---|-----------|-------------|
| Communication | Report back to parent only | Message each other directly |
| Coordination | Fire-and-forget | Shared task list, claim tasks, debate approaches |
| Context | Isolated | Shared findings across teammates |

### Cost-Saving Pattern

Tell the orchestrator which model each teammate should run:

- **Debugger** on Opus -- deep reasoning
- **Implementation** on Sonnet -- speed
- **Tests** on Haiku -- cost efficiency

### Best Use Cases

- **Research & review** -- multiple teammates investigate different aspects simultaneously
- **New modules or features** -- teammates each own a separate piece
- **Debugging with competing hypotheses** -- teammates test theories in parallel and debate
- **Cross-layer coordination** -- frontend, backend, and tests each owned by a different teammate

---

## 5. Subagent Worktree Isolation

Combine worktrees with subagents for truly conflict-free parallel execution. Add `isolation: worktree` to the agent's frontmatter:

```yaml
---
name: refactor-module-a
isolation: worktree
---
Refactor the authentication module...
```

Each subagent gets its own isolated worktree -- a temporary branch and repo copy -- preventing file collisions even when Claude spawns multiple sub-agents within a single session.

- **No changes** --> worktree auto-cleans
- **Edits made** --> worktree persists with branch name, ready for review

---

## 6. Shared Skills and Custom Commands

After productive sessions, ask Claude Code to generate a **skill** that codifies those learnings. Skills encode organizational best practices that scale across developers.

### Custom Commands

Commit custom slash commands to `.claude/commands/` in the repo. Both developers get them automatically:

```
.claude/commands/
  review-pr.md      # PR review workflow
  run-full-ci.md    # Full CI pipeline locally
  deploy-staging.md # Staging deployment steps
```

### Hooks for Deterministic Behavior

The Hooks system lets you enforce behavior that fires **100% of the time** (linting, formatting, security checks), unlike `CLAUDE.md` which is advisory.

---

## 7. Recommended Daily Workflow

```
+-------------------+     +---------------------+     +-------------------+
|  1. Shared Repo   |     |  2. Worktrees for   |     |  3. GitHub Actions |
|  + CLAUDE.md      | --> |     Isolation        | --> |  + @claude         |
|                   |     |                     |     |                   |
| Identical context |     | claude --worktree   |     | Tag @claude on    |
| for both devs     |     | <feature-name>      |     | issues & PRs      |
+-------------------+     +---------------------+     +-------------------+
         |                         |                          |
         v                         v                          v
+-------------------+     +---------------------+     +-------------------+
|  4. PR-Based      |     |  5. Shared Custom   |     |  6. Agent Teams   |
|     Flow          | <-- |     Commands        | <-- |  for Big Features |
|                   |     |                     |     |                   |
| Both open PRs,    |     | .claude/commands/   |     | Parallelize across|
| Claude reviews,   |     | committed to repo   |     | frontend, backend,|
| human approves    |     |                     |     | and tests         |
+-------------------+     +---------------------+     +-------------------+
```

### The Core Loop

1. **Shared Repo + CLAUDE.md** -- Both developers get identical Claude context
2. **Worktrees for Isolation** -- `claude --worktree <feature>` so sessions never collide
3. **GitHub Actions + @claude** -- Tag Claude on issues for small tasks, automated PR reviews, doc updates
4. **PR-Based Flow** -- Both devs open PRs, Claude reviews automatically, other human does final review
5. **Shared Custom Commands** -- Team knowledge in `.claude/commands/`
6. **Agent Teams for Big Features** -- Spawn teams to parallelize across frontend, backend, and tests

---

## Project Structure

```
CollabTest/
├── CLAUDE.md                          # Shared project context (the foundation)
├── README.md                          # This file
├── .claude/
│   ├── commands/                      # Shared custom slash commands
│   │   └── .gitkeep
│   └── settings.json                  # Shared Claude Code settings
├── .github/
│   ├── workflows/
│   │   └── claude-code.yml            # @claude GitHub Action
│   └── PULL_REQUEST_TEMPLATE.md       # PR template
├── src/                               # Application source code
│   └── .gitkeep
├── tests/                             # Test files
│   └── .gitkeep
└── .gitignore
```

---

## Setup Checklist

- [x] Create public GitHub repo
- [x] Initialize with README and CLAUDE.md
- [x] Set up `.github/workflows/claude-code.yml`
- [x] Create `.claude/commands/` directory
- [x] Add `.gitignore`
- [x] Add PR template
- [ ] Add `ANTHROPIC_API_KEY` to repository secrets
- [ ] Install Claude GitHub App (`/install-github-app`)
- [ ] Bryan clones the repo and verifies Claude Code loads `CLAUDE.md`
- [ ] Test worktree workflow with a sample feature branch
- [ ] Test `@claude` tagging on a sample issue
- [ ] Enable agent teams and run a test coordination session

---

## Contributing

This is a two-person project between **Ryan Decker** and **Bryan**. The workflow:

1. Create a worktree for your feature: `claude --worktree feature-name`
2. Do your work with Claude Code
3. Open a PR -- Claude reviews it automatically via GitHub Actions
4. The other person does final human review
5. Merge to main

**Never push directly to main.** Always go through a PR.

---

## License

MIT

---

*Built with [Claude Code](https://claude.ai/claude-code) -- testing the future of AI-assisted collaborative development.*
