# Contributing — How We Work Together

> Two developers, both using Claude Code, working on a shared codebase.
> This doc is the process that keeps us from colliding.

---

## The Core Loop

```
1. Open an Issue (or pick one up)
         ↓
2. Self-assign it
         ↓
3. Create a branch (or worktree)
         ↓
4. Build it
         ↓
5. Open a PR (<300 lines of non-test code, clear description)
         ↓
6. Other dev reviews within 24h
         ↓
7. Update CLAUDE.md if needed (same PR)
         ↓
8. Approve → Merge → Close Issue
```

---

## Claiming Work

- **GitHub Issues are the work queue.** No work starts without an issue — even small things.
- **Self-assign before starting.** That's the signal that someone's on it.
- **One issue = one branch = one PR.** Keep the mapping clean.
- **Exploratory work** gets a `spike/` branch prefix and a `spike` label on the issue. Spikes are throwaway by default.

---

## Pull Requests

### Size

- **Target: under 300 lines of non-test code per PR.** Tests can be as long as they need to be.
- If a feature is bigger, break it into stacked PRs — each reviewable and mergeable on its own.

### Description

Every PR must include:

- What issue it addresses
- What approach was taken (and why, if non-obvious)
- How to test it locally
- Any decisions that should feed back into CLAUDE.md

### Branch Naming

- `feat/short-description` — new functionality
- `fix/short-description` — bug fixes
- `docs/short-description` — documentation only
- `refactor/short-description` — restructuring without behavior change
- `spike/short-description` — exploratory, may be discarded

---

## Code Review

- **Every PR gets a human review.** Automated reviews supplement but don't replace this.
- **Review within 24 hours** or comment that you need more time. Stale PRs kill momentum.
- **Approval = merge.** Don't let approved PRs sit.

### Review Checklist

- Does this match the issue's intent?
- Are there patterns that conflict with existing code?
- Would I be comfortable debugging this at 2 AM?
- Does CLAUDE.md need updating?

---

## Keeping CLAUDE.md Current

`CLAUDE.md` is the shared context for both devs' Claude Code sessions. If it drifts from reality, our tools give inconsistent guidance.

- **Any PR that introduces a new pattern or architectural decision must update CLAUDE.md in the same PR.** Not a follow-up.
- **Check CLAUDE.md during every review.** If the PR changes how something works but CLAUDE.md doesn't reflect it, that's a review comment.

---

## Handling Disagreements

- **First PR with tests wins**, unless there's a clear technical argument against it. Momentum over perfection.
- **Architectural disagreements get discussed in the Issue before code is written.** A 10-minute comment thread beats two competing PRs.
- **No "just rewrite it" PRs.** Want to change a merged approach? Open an issue explaining why, get agreement, then do it.
- **CLAUDE.md is the tiebreaker.** If a convention is documented there, follow it. Want to change it? Propose the change to CLAUDE.md first.

---

## Where Discussions Happen

- **GitHub Issues** — anything actionable (features, bugs, tasks, spikes)
- **GitHub Discussions** — architecture questions, "should we use X or Y?", retrospectives
- **PR comments** — code-specific feedback
- **Not in DMs.** If it affects the codebase, it belongs in the repo where both devs and their tools can see it.

---

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new functionality
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code restructuring, no behavior change
- `test:` — adding or updating tests
- `chore:` — tooling, CI, dependencies

Keep commits atomic and well-described.
