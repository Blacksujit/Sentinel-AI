import Link from 'next/link';
import BrandMark from './BrandMark';

const GITHUB_REPO = 'https://github.com/Blacksujit/Sentinel-AI';
const GITHUB_ISSUES = 'https://github.com/Blacksujit/Sentinel-AI/issues';
const GITHUB_RELEASES = 'https://github.com/Blacksujit/Sentinel-AI/releases';
const GITHUB_ACTIONS = 'https://github.com/Blacksujit/Sentinel-AI/actions';
const GITHUB_PROFILE = 'https://github.com/Blacksujit';
const SPONSORS = 'https://github.com/sponsors/Blacksujit';
const EMAIL = 'mailto:nirmalsujit981@gmail.com';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="icon-sm">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="icon-sm">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="icon-sm">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon-sm">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function CoffeeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon-sm">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="brand">
              <BrandMark />
              SentinelAI
            </Link>
            <p>
              A verification layer that sits between your model and your users —
              catching hallucinations, jailbreaks, and unsafe output before they
              ship.
            </p>
            <div className="footer-socials">
              <a href={GITHUB_REPO} aria-label="GitHub" target="_blank" rel="noreferrer">
                <GitHubIcon />
              </a>
              <a
                href="https://www.linkedin.com/in/sujit-nirmal"
                aria-label="LinkedIn"
                target="_blank"
                rel="noreferrer"
              >
                <LinkedInIcon />
              </a>
              <a
                href="https://x.com/sujit_nirmal05"
                aria-label="X (Twitter)"
                target="_blank"
                rel="noreferrer"
              >
                <XIcon />
              </a>
              <a
                href="https://www.instagram.com/_.ds.7_infinity/"
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <Link href="/">Home</Link>
              <Link href="/analyze">Analyze</Link>
              <Link href="/docs">Docs</Link>
            </div>
            <div className="footer-col">
              <h4>Open Source</h4>
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
                Star this repo
              </a>
              <a href={GITHUB_ISSUES} target="_blank" rel="noreferrer">
                Start contributing
              </a>
              <a href={SPONSORS} target="_blank" rel="noreferrer" className="coffee-link">
                <CoffeeIcon />
                Buy us a coffee
              </a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={GITHUB_ACTIONS} target="_blank" rel="noreferrer">
                Status
              </a>
              <a href={GITHUB_RELEASES} target="_blank" rel="noreferrer">
                Changelog
              </a>
            </div>
            <div className="footer-col">
              <h4>About</h4>
              <a href={GITHUB_PROFILE} target="_blank" rel="noreferrer">
                Developer
              </a>
              <a
                href="https://sujit-dev-nine.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                Portfolio
              </a>
              <a
                href="https://blackshadow.hashnode.dev/"
                target="_blank"
                rel="noreferrer"
              >
                Blog
              </a>
              <a href={EMAIL}>Contact</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SentinelAI. Open source, MIT licensed.</span>
          <span>Built to catch what shouldn&apos;t have been said.</span>
        </div>
      </div>
    </footer>
  );
}