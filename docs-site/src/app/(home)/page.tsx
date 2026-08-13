import Link from "next/link";
import type { ReactNode } from "react";
import { assetPath } from "@/lib/shared";

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
    icon: (
      <Icon>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 12l10 5 10-5" />
        <path d="M2 17l10 5 10-5" />
      </Icon>
    ),
    title: "3 signal detectors in parallel",
    description:
      "Prompt anomaly detection (Jaccard similarity against your baselines), jailbreak detection (sentence-transformer cosine similarity), and output risk scoring (regex heuristics across 8 categories: violence, hate speech, self-harm, illegal activity, misinformation, privacy, inappropriate content, harmful instructions).",
  },
  {
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
      </Icon>
    ),
    title: "Explainable verdicts",
    description:
      "Every decision ships with a human-readable reason, the flags that triggered it, and the exact thresholds applied — plus a settings version, so any score can be replayed against the policy that produced it.",
  },
  {
    icon: (
      <Icon>
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </Icon>
    ),
    title: "4 policy actions + correction",
    description:
      "The policy engine maps the risk score to allow, warn, block, or escalate — and the SDK's correct() returns a cleaned response instead of a failure.",
  },
  {
    icon: (
      <Icon>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </Icon>
    ),
    title: "Conversation-aware",
    description:
      "The SDK's ConversationTracker tracks turns across a session, scores each turn, and reports conversation-level risk statistics.",
  },
  {
    icon: (
      <Icon>
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
      </Icon>
    ),
    title: "3-line SDK",
    description:
      "pip install sentinelai-risk, then verify() returns a 0–100 score, status, claims, and corrected text. Retries with exponential backoff, parallel batch analysis, and API-key auth built in.",
  },
  {
    icon: (
      <Icon>
        <rect x="2" y="3" width="20" height="7" rx="2" />
        <rect x="2" y="14" width="20" height="7" rx="2" />
        <path d="M6 6.5h.01M6 17.5h.01" />
      </Icon>
    ),
    title: "Self-hostable",
    description:
      "Open-source FastAPI core with SQLite/PostgreSQL storage. The same SDK and API run against your own base URL — data never leaves your network.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-16">
        <img
          src={assetPath("/logo.svg")}
          alt="SentinelAI"
          className="mb-8 h-8 w-auto"
        />

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          AI risk monitoring
          <br />
          for production LLMs
        </h1>

        <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mb-10">
          Catch hallucinations, prompt injections, and jailbreaks{" "}
          <span className="font-semibold text-fd-foreground">before</span> they
          reach your users.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 text-sm font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
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

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-fd-muted-foreground">
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
      </section>

      <section className="border-t border-fd-border bg-fd-muted/40">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-fd-border bg-fd-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-3">{feature.icon}</div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm text-fd-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center px-6 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Deploy AI with confidence</h2>
        <p className="max-w-xl text-fd-muted-foreground mb-8">
          Every organization deploying LLMs needs to know when the model is
          wrong. SentinelAI makes risk visible, explainable, and controllable.
        </p>
        <Link
          href="/docs/quickstart"
          className="font-medium text-fd-primary hover:underline"
        >
          Get started in 60 seconds →
        </Link>
      </section>
    </div>
  );
}
