import Link from "next/link";
import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-fd-primary"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const features = [
  {
    href: "/docs/detectors",
    icon: (
      <Icon>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 12l10 5 10-5" />
        <path d="M2 17l10 5 10-5" />
      </Icon>
    ),
    title: "Catches what filters miss",
    description:
      "Naive filters only match keywords, so attackers paraphrase around them. Three detectors run in parallel — prompt anomalies, jailbreak attempts, and risky output across 8 categories like violence, hate speech, and self-harm.",
  },
  {
    href: "/docs/trust-score",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
      </Icon>
    ),
    title: "Know why it was flagged",
    description:
      "A bare score tells you nothing. Every verdict ships with the reason, the flags that triggered it, and the thresholds applied — so you can replay any score against the policy that produced it.",
  },
  {
    href: "/docs/quickstart",
    icon: (
      <Icon>
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </Icon>
    ),
    title: "Act, don't fail",
    description:
      "A risky response isn't a dead end. The policy engine allows, warns, blocks, or escalates — and correct() returns a cleaned response instead of an error.",
  },
  {
    href: "/docs/sdk",
    icon: (
      <Icon>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </Icon>
    ),
    title: "Watch the whole conversation",
    description:
      "One prompt can look harmless while the conversation drifts. ConversationTracker scores every turn and rolls them up into conversation-level risk.",
  },
  {
    href: "/docs/quickstart",
    icon: (
      <Icon>
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
      </Icon>
    ),
    title: "Live in three lines",
    description:
      "pip install sentinelai-risk, call verify(), and get a 0–100 score with a clear verdict. Retries, parallel batches, and API-key auth are handled for you.",
  },
  {
    href: "/docs/self-hosting",
    icon: (
      <Icon>
        <rect x="2" y="3" width="20" height="7" rx="2" />
        <rect x="2" y="14" width="20" height="7" rx="2" />
        <path d="M6 6.5h.01M6 17.5h.01" />
      </Icon>
    ),
    title: "Keep data on your network",
    description:
      "The core is open source and self-hostable. Same SDK, same API, your own server — with SQLite or PostgreSQL behind it.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden flex flex-col items-center text-center px-6 pt-24 pb-16">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <span className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3.5 py-1.5 text-xs font-medium text-fd-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-fd-primary" />
          Open source · MIT licensed · Python 3.9+
        </span>

        <h1 className="relative text-4xl md:text-6xl font-bold tracking-tight mb-6">
          AI risk monitoring
          <br />
          <span className="bg-gradient-to-r from-[hsl(233_100%_60%)] via-[hsl(265_82%_60%)] to-[hsl(199_90%_55%)] bg-clip-text text-transparent">
            for production LLMs
          </span>
        </h1>

        <p className="relative text-lg md:text-xl text-fd-muted-foreground max-w-2xl mb-8">
          Catch hallucinations, prompt injections, and jailbreaks{" "}
          <span className="font-semibold text-fd-foreground">before</span> they
          reach your users.
        </p>

        <div className="pip-card relative mb-8" aria-label="Install command">
          <span className="prompt">$</span>
          <code>pip install sentinelai-risk</code>
          <span className="badge">PyPI</span>
        </div>

        <div className="relative flex items-center gap-4 mb-4">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 text-sm font-semibold text-fd-primary-foreground shadow-[0_8px_24px_-8px_var(--color-fd-primary)] transition-opacity hover:opacity-90"
          >
            Read the docs
            <span aria-hidden>→</span>
          </Link>
          <a
            href="https://sentinelaihq.com"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-fd-accent"
          >
            Live Demo
          </a>
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-2 text-xs text-fd-muted-foreground">
          <span className="rounded-full border border-fd-border px-3 py-1">
            Python 3.9+
          </span>
          <span className="rounded-full border border-fd-border px-3 py-1">
            Self-hosted
          </span>
          <span className="rounded-full border border-fd-border px-3 py-1">
            Open source
          </span>
          <span className="rounded-full border border-fd-border px-3 py-1">
            FastAPI
          </span>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <a
            href="https://github.com/Blacksujit/Sentinel-AI"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-4 py-2 font-medium transition-colors hover:bg-fd-accent"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Star this repo
          </a>
          <a
            href="https://github.com/Blacksujit/Sentinel-AI/issues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-4 py-2 font-medium transition-colors hover:bg-fd-accent"
          >
            Start contributing
          </a>
          <a
            href="https://github.com/sponsors/Blacksujit"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-4 py-2 font-medium transition-colors hover:bg-fd-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" x2="6" y1="2" y2="4" />
              <line x1="10" x2="10" y1="2" y2="4" />
              <line x1="14" x2="14" y1="2" y2="4" />
            </svg>
            Buy us a coffee
          </a>
        </div>
      </section>

      <section className="border-t border-fd-border bg-fd-muted/40">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="feature-card group flex flex-col rounded-xl border border-fd-border bg-fd-card p-6"
            >
              <div className="icon-tile mb-4">{feature.icon}</div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="mb-4 text-sm text-fd-muted-foreground">
                {feature.description}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-fd-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex justify-center px-6 py-16">
        <div className="cta-border w-full max-w-3xl">
          <div className="cta-inner flex flex-col items-center text-center">
            <h2 className="mb-4 text-2xl font-bold tracking-tight">
              Deploy AI with confidence
            </h2>
            <p className="mb-8 max-w-xl text-fd-muted-foreground">
              Every organization deploying LLMs needs to know when the model is
              wrong. SentinelAI makes risk visible, explainable, and
              controllable.
            </p>
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 text-sm font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
            >
              Get started in 60 seconds
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
