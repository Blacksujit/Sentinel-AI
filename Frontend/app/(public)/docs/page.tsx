'use client'

import { useState } from 'react';
import { Copy, Check, ChevronRight } from 'lucide-react';

const DETECTORS = [
  { id: 'unsupported-claim', label: 'Unsupported Claim', severity: 'critical', description: 'A factual statement presented with confidence but with no basis in the provided context or verifiable source.' },
  { id: 'fabricated-citation', label: 'Fabricated Citation', severity: 'critical', description: 'References a paper, case, statistic, or quote that does not exist, or misattributes a real one.' },
  { id: 'numeric-drift', label: 'Numeric Drift', severity: 'high', description: 'Numbers, dates, or quantities that are internally inconsistent or contradict the source material.' },
  { id: 'entity-confusion', label: 'Entity Confusion', severity: 'high', description: 'Conflates two similar people, places, products, or organizations into one incorrect answer.' },
  { id: 'context-contradiction', label: 'Context Contradiction', severity: 'high', description: 'The response directly contradicts a fact stated earlier in the prompt or conversation.' },
  { id: 'overconfidence', label: 'Overconfidence Marker', severity: 'medium', description: 'Hedge-free, definitive language wrapped around a claim the model has no way to verify.' },
];

const PIPELINE = [
  { id: '01', title: 'Exchange arrives', detail: 'The prompt and the model\u2019s draft response are sent to /api/verify before the user ever sees them.' },
  { id: '02', title: 'Claims are extracted', detail: 'Sentinal AI parses the response into discrete factual claims \u2014 names, numbers, dates, citations, causal statements.' },
  { id: '03', title: 'Each claim is checked', detail: 'Every claim is cross-referenced against the supplied context, retrieved sources, and internal consistency rules.' },
  { id: '04', title: 'Risk is scored', detail: 'Flagged claims are weighted by severity into a single 0\u2013100 hallucination score for the exchange.' },
  { id: '05', title: 'A correction is drafted', detail: 'For anything above threshold, Sentinal AI proposes a corrected span \u2014 not just a flag, a fix \u2014 ready to swap in.' },
];

const THRESHOLDS = [
  { id: 'trusted', label: 'Trusted', range: '0 \u2013 24', desc: 'No unverified claims found. Ship the response as-is.', tone: 'green' },
  { id: 'review', label: 'Needs review', range: '25 \u2013 59', desc: 'Minor or unverifiable claims. Flag for a human, or auto-correct low-risk spans.', tone: 'amber' },
  { id: 'hallucinated', label: 'Hallucinated', range: '60 \u2013 100', desc: 'High-confidence fabrication detected. Block, or serve the corrected version.', tone: 'red' },
];

const REQUEST_SAMPLE = `POST /api/verify
Content-Type: application/json

{
  "prompt": "Who won the Nobel Prize in Physics in 2019?",
  "response": "It was awarded entirely to Stephen Hawking..."
}`;

const RESPONSE_SAMPLE = `{
  "score": 91,
  "status": "hallucinated",
  "claims": [
    {
      "detector": "Unsupported Claim",
      "text": "awarded entirely to Stephen Hawking",
      "severity": "critical",
      "source": "response",
      "note": "Hawking died in 2018 and was never
                awarded a Nobel Prize."
    }
  ],
  "corrected": "James Peebles, Michel Mayor, and
                Didier Queloz, for discoveries in
                physical cosmology and exoplanet
                detection.",
  "meta": {
    "claims_checked": 4,
    "detectors_run": 6,
    "verified_at": "2026-06-21T09:14:02Z"
  }
}`;

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Verification pipeline' },
  { id: 'detectors', label: 'Detector reference' },
  { id: 'scoring', label: 'Scoring & thresholds' },
  { id: 'api', label: 'API schema' },
  { id: 'sdk', label: 'SDK quickstart' },
];

export default function DocsPage() {
  return (
    <section className="docs-page">
      <div className="wrap docs-grid">
        <aside className="docs-toc">
          <span className="demo-label">ON THIS PAGE</span>
          <nav>
            {TOC.map((item) => (
              <a key={item.id} href={'#' + item.id} className="docs-toc-link">
                <ChevronRight size={13} /> {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="docs-content">
          <div id="overview" className="docs-section">
            <span className="section-eyebrow">— DOCUMENTATION</span>
            <h1 className="section-title">How Sentinal AI works</h1>
            <p className="section-lede">
              A single API call inspects a prompt/response pair, extracts every
              checkable factual claim, verifies each one, and returns a
              structured report — score, flags, and a ready-to-use correction.
            </p>
          </div>

          <div id="pipeline" className="docs-section">
            <h2 className="docs-h2">Verification pipeline</h2>
            <div className="docs-pipeline">
              {PIPELINE.map((step) => (
                <div key={step.id} className="docs-pipeline-row">
                  <span className="docs-pipeline-num">{step.id}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="detectors" className="docs-section">
            <h2 className="docs-h2">Detector reference</h2>
            <p className="docs-p">
              Six detectors run against every response. Each flagged claim
              records which detector caught it, how severe it is, and the
              exact excerpt responsible.
            </p>
            <div className="docs-detector-list">
              {DETECTORS.map((d) => (
                <div key={d.id} className="docs-detector-row">
                  <div className="docs-detector-row-head">
                    <h3>{d.label}</h3>
                    <span className={'sev-pill sev-' + d.severity}>{d.severity}</span>
                  </div>
                  <p>{d.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="scoring" className="docs-section">
            <h2 className="docs-h2">Scoring & thresholds</h2>
            <p className="docs-p">
              Each flagged claim carries a severity weight
              (critical = 70, high = 40, medium = 18). Weighted scores sum
              with diminishing returns for repeated flags, then cap at 100 to
              produce a single 0–100 hallucination score.
            </p>
            <div className="docs-threshold-row">
              {THRESHOLDS.map((t) => (
                <div key={t.id} className={'docs-threshold-chip tone-' + t.tone}>
                  <span className="docs-threshold-chip-label">{t.label}</span>
                  <span className="docs-threshold-chip-range">{t.range}</span>
                  <p>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="api" className="docs-section">
            <h2 className="docs-h2">API schema</h2>
            <p className="docs-p">One endpoint. Send what you have — a prompt, a response, or both.</p>
            <CodeBlock label="Request" code={REQUEST_SAMPLE} />
            <div style={{ height: 18 }} />
            <CodeBlock label="Response" code={RESPONSE_SAMPLE} />
          </div>

          <div id="sdk" className="docs-section">
            <h2 className="docs-h2">SDK quickstart</h2>
            <p className="docs-p">Available now for Node and Python; Go is in beta.</p>
            <CodeBlock
              label="npm"
              code={`npm install sentinal-ai-sdk

import { SentinalAI } from "sentinal-ai-sdk";
const sentinalAI = new SentinalAI({ apiKey: process.env.SENTINAL_AI_KEY });

const result = await sentinalAI.verify({ prompt, response });`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="docs-code-panel">
      <div className="docs-code-head">
        <span className="docs-code-label">{label}</span>
        <button className="docs-copy-btn" onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-block"><code>{code}</code></pre>
    </div>
  );
}
