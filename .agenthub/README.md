# AgentHub for SentinelAI

Multi-agent collaboration is configured for this repo. Agents work in
parallel in isolated git worktrees, each owning one surface (backend,
frontend, SDK, docs, infra), and the coordinator merges the best result.

## What's here

```
.agenthub/
├── config.yaml              # Agent roster — who owns what + verify commands
├── COORDINATOR.md           # How to drive a session (init→spawn→eval→merge)
├── templates/
│   └── dispatch-prompts.md  # Agent dispatch prompts (feature/optimizer/bugfix/test)
├── eval/
│   └── eval_sentinelai.py   # Metric parser (pass rate, coverage, build)
├── board/                   # Message board (dispatch / progress / results)
│   ├── _index.json
│   ├── dispatch/
│   ├── progress/
│   └── results/
└── sessions/                # One dir per session (config.yaml + state.json)
```

## Agents configured

| Agent | Surface | Verifies with |
|-------|---------|---------------|
| backend-engineer | `Backend/` | `ruff check app/` + `pytest tests/` |
| frontend-engineer | `Frontend/` | `npm run lint` + `type-check` + `build` |
| sdk-engineer | `sentinelai-sdk/` | `python -m pytest` |
| docs-engineer | `docs-site/`, `Docs/` | `npm run build` |
| reliability-engineer | `.github/`, `render.yaml`, Dockerfile | `docker compose config` |

Each agent has a strict `owns` + `forbidden` boundary so they never
clobber each other's work, and every agent must pass its verification
commands before it's allowed to commit.

## Quick start

See `.agenthub/COORDINATOR.md` for the full lifecycle. Short version:

```bash
HUB=.opencode/skills/agenthub/scripts

# 1. Create a session
python $HUB/hub_init.py --task "your feature or fix" --agents 3 --base-branch main

# 2. Dispatch agents (see COORDINATOR.md → DISPATCH)
# 3. Monitor: ls .agenthub/board/progress/
# 4. Evaluate + merge the winner (see COORDINATOR.md → EVALUATE / MERGE)
```

## Why this setup

- **Feature sessions** dispatch agents across surfaces so they compose
  into a full deliverable (backend endpoint + frontend UI + docs) instead
  of three agents editing the same files.
- **Optimization/bug sessions** dispatch multiple agents against the same
  surface with different strategies and keep the best one.
- Every agent's output is verified by real CI commands (the same ones in
  `.github/workflows/`), so "it works" means tests pass, not "it compiles."
- The DAG is append-only — losing approaches are tagged, never deleted.
