# SentinelAI — AgentHub Coordinator Playbook

This is the operating manual for running AgentHub sessions in this repo.
The coordinator is whoever (human or main Claude session) drives the loop:
`INIT → DISPATCH → MONITOR → EVALUATE → MERGE`.

## Prerequisites (one-time)

The AgentHub scripts live at `.opencode/skills/agenthub/scripts/`. They are
plain Python (stdlib only). No pip install needed.

```bash
HUB=.opencode/skills/agenthub/scripts
```

## Lifecycle

### 1. INIT — create a session

```bash
python $HUB/hub_init.py \
  --task "Ship the /baselines API + dashboard UI for prompt drift baselines" \
  --agents 3 \
  --base-branch main \
  --format json
```

This creates `.agenthub/sessions/{session-id}/` with config.yaml + state.json.

### 2. DISPATCH — spawn agents

For a **feature** (build a thing that works end-to-end), dispatch across
surfaces so the agents compose into a complete deliverable:

| Agent | Role | Surface | Owns this part of the feature |
|-------|------|---------|-------------------------------|
| 1 | backend-engineer | Backend/ | Endpoint + logic + pytest |
| 2 | frontend-engineer | Frontend/ | UI consuming the endpoint |
| 3 | sdk-engineer or docs-engineer | sdk/ or docs-site/ | SDK method or docs update |

For **optimization** or **bug-fix**, dispatch multiple agents against the
SAME surface with different strategies (see dispatch-prompts.md).

To dispatch, write assignment files and spawn agents:

```bash
# For each agent i:
#   write .agenthub/board/dispatch/{seq}-agent-{i}.md
#   git worktree add -b hub/{session-id}/agent-{i} .agenthub/worktrees/agent-{i}
#   spawn the agent in that worktree with the dispatch prompt
```

Each agent's dispatch prompt is built from
`.agenthub/templates/dispatch-prompts.md` with variables filled from
`.agenthub/config.yaml`.

### 3. MONITOR — check progress

```bash
python $HUB/dag_analyzer.py --status --session {session-id}
```

Or read the board directly:
```bash
ls .agenthub/board/progress/   # agent status updates
ls .agenthub/board/results/    # final results
```

### 4. EVALUATE — pick the winner

**Metric mode** (for optimization / test-writer):
```bash
python $HUB/result_ranker.py --session {session-id} \
  --eval-cmd "cd Backend && pytest tests/ -v --tb=short" \
  --metric passed --direction higher
```

**Judge mode** (for features / bug-fixes): read each agent's diff and result
summary, rank by:
1. Correctness — does the feature work and verify pass?
2. Completeness — is it usable by a real user, or partial?
3. Quality — clean code, tests included, no scope creep.
4. Minimal — fewer files changed, smaller diff preferred.

**Hybrid**: metric first; if top 2 are within 10%, judge breaks the tie.

### 5. MERGE — finalize

```bash
# Merge winner into main
git checkout main
git merge --no-ff hub/{session-id}/agent-{winner}

# Archive losers as tags (DAG is append-only — never delete)
git tag hub/archive/{session-id}/agent-{loser}

# Clean up worktrees
git worktree remove .agenthub/worktrees/agent-{i}
```

Update `.agenthub/sessions/{session-id}/state.json` → state: "merged".

Post merge summary to `.agenthub/board/results/`.

## Rules (do not break these)

1. **One surface per agent.** An agent never edits files outside its `owns`.
   If a feature needs a cross-surface change, the agent posts to the board
   and the coordinator schedules a follow-up session for the other surface.
2. **Verify before commit, always.** Each agent runs its
   `verify_before_commit` commands and only commits when all pass. A commit
   with failing tests/lint is not a deliverable — it's noise.
3. **DAG is append-only.** Never rebase or force-push agent branches. Losers
   are tagged, not deleted. Every approach is preserved.
4. **No agent sees another's work.** Agents work in isolated worktrees and
   only write to the board. The coordinator reads the board and merges.
5. **Build for the user, not for the commit count.** If a feature doesn't
   make sense, the agent should say so and propose better scope — the
   dispatch prompt explicitly allows this.

## Common session recipes

### Ship a new dashboard feature
```bash
python $HUB/hub_init.py --task "Add API key usage charts to dashboard" \
  --agents 3 --base-branch main
# Agent 1: backend — GET /api/usage endpoint + tests
# Agent 2: frontend — charts component + page wiring
# Agent 3: docs — update dashboard docs + SDK usage example
```

### Fix a production bug
```bash
python $HUB/hub_init.py --task "Dashboard crashes on empty workspace" \
  --agents 3 --base-branch main
# All 3 agents → frontend-engineer, different diagnostic strategies
# Winner = the fix that resolves the crash with smallest diff + test
```

### Optimize backend latency
```bash
python $HUB/hub_init.py --task "Reduce /analyze p50 latency below 200ms" \
  --agents 3 --base-branch main \
  --eval "cd Backend && pytest tests/test_smoke.py --json" \
  --metric p50_ms --direction lower
# Agent 1: caching strategy
# Agent 2: algorithmic optimization
# Agent 3: I/O batching
```

### Grow test coverage
```bash
python $HUB/hub_init.py --task "Cover the scoring/ and monitors/ modules" \
  --agents 3 --base-branch main \
  --eval "cd Backend && pytest --cov=app.scoring --cov=app.monitors --cov-report=term" \
  --metric cov_percent --direction higher
# Agent 1: happy path tests
# Agent 2: edge cases
# Agent 3: integration tests
```

## Proactive signals (coordinator should act)

| Signal | Action |
|--------|--------|
| All agents crashed | Post failure summary, retry with different constraints |
| No improvement over baseline | Archive session, try different approaches |
| Orphan worktrees | `python $HUB/session_manager.py --cleanup {id}` |
| Session stuck in "running" | Check board for progress, consider timeout |
| Agent requests cross-surface change | Schedule follow-up session for that surface |
