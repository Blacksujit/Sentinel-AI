<p align="center">
  <img src="docs-site/public/logo.svg" alt="SentinelAI" width="320">
</p>

<p align="center">
  <b>AI risk monitoring for production LLMs.</b><br>
  Catch hallucinations, prompt injections, and jailbreaks <i>before</i> they reach your users.
</p>

<p align="center">
  <a href="https://sentinelaihq.com"><b>Live Demo</b></a>
  &nbsp;•&nbsp;
  <a href="https://blacksujit.github.io/Sentinel-AI/"><b>Documentation</b></a>
  &nbsp;•&nbsp;
  <a href="https://sentinel-ai-dml3.onrender.com/api/docs">API Docs</a>
  &nbsp;•&nbsp;
  <a href="https://pypi.org/project/sentinelai-sdk/">PyPI</a>
</p>

---

SentinelAI monitors production LLM responses for risk in real time. Six detectors run in
parallel — fabricated citations, numeric drift, entity confusion, contradictions, unsupported
claims, and overconfidence — and every score ships with token-level reasons.

## Quick start

```bash
pip install sentinelai-sdk
```

```python
from sentinelai_sdk import SentinelAI

client = SentinelAI(api_key="your-api-key")

result = client.guard(
    messages=[{"role": "user", "content": "What is the capital of France?"}],
    response="The capital of France is Paris.",
)
print(result.risk_score, result.reasons)
```

See the [quickstart guide](https://blacksujit.github.io/Sentinel-AI/docs/quickstart) for
configuration, modes, and self-hosting.

## Features

- **6 detectors in parallel** — fabricated citations, numeric drift, entity confusion,
  contradictions, unsupported claims, overconfidence
- **Explainable risk** — every score ships with token-level reasons, no black boxes
- **Auto-correction** — serve a cleaned response instead of a risky one
- **Conversation-aware** — risk judged across multi-turn context
- **Self-hostable** — open-source core, your data stays on your infrastructure

## Documentation

The documentation site is a static Next.js/Fumadocs build, deployed to GitHub Pages:

**https://blacksujit.github.io/Sentinel-AI/**

Source lives in [`docs-site/`](docs-site) — static export via `output: 'export'` with a
`/Sentinel-AI` base path, built by [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
on every push to `main`.

Local dev:

```bash
cd docs-site
npm install
npm run dev
```

## Repository layout

| Path | Contents |
| --- | --- |
| `docs-site/` | Documentation website (Next.js + Fumadocs, static export) |
| `Backend/` | SentinelAI API backend |
| `Frontend/` | Web dashboard |
| `sentinelai-sdk/` | Python SDK |
| `Docs/` | Source documentation & design notes |

## License

See [LICENSE](LICENSE).