'use client'

import Link from 'next/link';
import {
  ArrowRight, GitFork, Search, FileWarning, Hash, Users,
  ShieldCheck, Zap, Check, Quote, AlertTriangle,
} from 'lucide-react';
import HeroDemo from '@/components/public/HeroDemo';
import Reveal from '@/components/public/Reveal';
import WaitlistForm from '@/components/public/WaitlistForm';

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

const STATS = [
  { value: '< 400ms', label: 'Added latency' },
  { value: '6', label: 'Verification passes' },
  { value: '0\u2013100', label: 'Unified trust score' },
  { value: '1', label: 'API call' },
];

const THRESHOLDS = [
  { id: 'trusted', label: 'Trusted', range: '0 \u2013 24', desc: 'No unverified claims found. Ship the response as-is.', tone: 'green' },
  { id: 'review', label: 'Needs review', range: '25 \u2013 59', desc: 'Minor or unverifiable claims. Flag for a human, or auto-correct low-risk spans.', tone: 'amber' },
  { id: 'hallucinated', label: 'Hallucinated', range: '60 \u2013 100', desc: 'High-confidence fabrication detected. Block, or serve the corrected version.', tone: 'red' },
];

const DETECTOR_ICONS: Record<string, React.ElementType> = {
  'unsupported-claim': Search,
  'fabricated-citation': Quote,
  'numeric-drift': Hash,
  'entity-confusion': Users,
  'context-contradiction': AlertTriangle,
  overconfidence: FileWarning,
};

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              REAL-TIME HALLUCINATION DETECTION
            </span>
            <h1>
              Your AI sounds <span className="strike-word">confident.</span>
              <br />
              That isn&apos;t the same as <em>correct.</em>
            </h1>
            <p className="hero-lede">
              Sentinal AI checks every prompt and response pair, catches claims your
              model can&apos;t back up, and rewrites them before your users ever see
              the mistake.
            </p>
            <div className="hero-ctas">
              <Link href="/start" className="btn btn-primary">
                Try the analyzer <ArrowRight size={16} />
              </Link>
              <Link href="/docs" className="btn btn-secondary">
                See how it works
              </Link>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item"><Check size={15} /> Drop-in API, no fine-tuning</span>
              <span className="hero-trust-item"><Check size={15} /> Model-agnostic</span>
              <span className="hero-trust-item"><Check size={15} /> Self-hostable</span>
            </div>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section className="stats-bar">
        <div className="wrap stats-grid">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06} className="stat-item">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <span className="section-eyebrow">— THE PROBLEM</span>
            <h2 className="section-title">
              Hallucinations don&apos;t look like errors.
              <br />
              They look like answers.
            </h2>
          </Reveal>
          <div className="problem-grid">
            <Reveal delay={0.05} className="problem-card">
              <span className="problem-quote-mark">&ldquo;</span>
              <p>
                A customer support bot invents a refund policy that
                doesn&apos;t exist — and a customer acts on it.
              </p>
            </Reveal>
            <Reveal delay={0.12} className="problem-card">
              <span className="problem-quote-mark">&ldquo;</span>
              <p>
                A research assistant cites a study that was never
                published, with a confident page number attached.
              </p>
            </Reveal>
            <Reveal delay={0.19} className="problem-card">
              <span className="problem-quote-mark">&ldquo;</span>
              <p>
                A legal copilot merges two real case names into one
                that sounds plausible — and is entirely fictional.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section-tinted" id="features">
        <div className="wrap">
          <Reveal>
            <span className="section-eyebrow">— DETECTORS</span>
            <h2 className="section-title">Six ways a model can mislead you. One layer that catches all of them.</h2>
            <p className="section-lede">
              Every detector runs in parallel against the full exchange. Nothing here
              requires touching your model or your training data.
            </p>
          </Reveal>
          <div className="detector-grid">
            {DETECTORS.map((d, i) => {
              const Icon = DETECTOR_ICONS[d.id] || Search;
              return (
                <Reveal key={d.id} delay={(i % 3) * 0.08} className="detector-card">
                  <div className={'detector-icon sev-' + d.severity}>
                    <Icon size={18} />
                  </div>
                  <div className="detector-head">
                    <h3>{d.label}</h3>
                    <span className={'sev-pill sev-' + d.severity}>{d.severity}</span>
                  </div>
                  <p>{d.description}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="wrap">
          <Reveal>
            <span className="section-eyebrow">— HOW IT WORKS</span>
            <h2 className="section-title">From answer to evidence in five steps.</h2>
          </Reveal>
          <div className="pipeline">
            {PIPELINE.map((step, i) => (
              <Reveal key={step.id} delay={i * 0.08} className="pipeline-step">
                <div className="pipeline-num-col">
                  <span className="pipeline-num">{step.id}</span>
                  {i < PIPELINE.length - 1 && <span className="pipeline-line" />}
                </div>
                <div className="pipeline-content">
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tinted">
        <div className="wrap">
          <Reveal>
            <span className="section-eyebrow">— SCORING</span>
            <h2 className="section-title">One score. Three plain outcomes.</h2>
            <p className="section-lede">
              No black-box probability to interpret. Every exchange lands in a
              band that tells your application exactly what to do next.
            </p>
          </Reveal>
          <div className="threshold-grid">
            {THRESHOLDS.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.1} className={'threshold-card tone-' + t.tone}>
                <span className="threshold-label">{t.label}</span>
                <span className="threshold-range">{t.range}</span>
                <p>{t.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap integration-grid">
          <Reveal>
            <span className="section-eyebrow">— INTEGRATION</span>
            <h2 className="section-title">Two lines of code. Any model.</h2>
            <p className="section-lede">
              Sentinal AI sits beside your existing stack — OpenAI, Anthropic, an
              open-weight model you host yourself. Send the exchange, get back
              a verdict.
            </p>
            <ul className="integration-list">
              <li><Zap size={16} /> Async or blocking — your call</li>
              <li><ShieldCheck size={16} /> No customer data leaves your infrastructure in self-hosted mode</li>
              <li><GitFork size={16} /> Open SDKs for Python, Node, and Go</li>
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="code-panel">
            <div className="code-panel-head">
              <span className="dot dot-red" /><span className="dot dot-amber" /><span className="dot dot-green" />
              <span className="hero-demo-title">verify.ts</span>
            </div>
            <pre className="code-block"><code>{`import { SentinalAI } from "sentinal-ai-sdk";

const sentinalAI = new SentinalAI({ apiKey: process.env.SENTINELAI_API_KEY });

const result = await sentinalAI.verify({
  prompt: userMessage,
  response: llmResponse,
});

if (result.status === "hallucinated") {
  return result.corrected; // serve the fix, not the flaw
}`}</code></pre>
          </Reveal>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap cta-inner">
          <Reveal>
            <h2>Stop shipping confident mistakes.</h2>
            <p>Paste a real exchange and watch Sentinal AI find what&apos;s wrong with it — right now, in your browser.</p>
          </Reveal>
          <Reveal delay={0.1} className="cta-actions">
            <Link href="/start" className="btn btn-accent">
              Open the analyzer <ArrowRight size={16} />
            </Link>
            <Link href="/docs" className="btn btn-secondary-dark">
              Read the docs
            </Link>
          </Reveal>
          <Reveal delay={0.18} className="cta-waitlist">
            <span className="cta-waitlist-label">Or get early access —</span>
            <WaitlistForm dark />
          </Reveal>
        </div>
      </section>
    </>
  );
}
