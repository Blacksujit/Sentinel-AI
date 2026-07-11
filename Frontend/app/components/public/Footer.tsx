import Link from 'next/link';
import BrandMark from './BrandMark';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="brand">
              <BrandMark />
              Sentinal AI
            </Link>
            <p>
              A verification layer that sits between your model and your users —
              catching hallucinations before they ship, and correcting them in place.
            </p>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <Link href="/">Home</Link>
              <Link href="/analyze">Analyze</Link>
              <Link href="/docs">Docs</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#">GitHub</a>
              <a href="#">Status</a>
              <a href="#">Changelog</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Sentinal AI. All rights reserved.</span>
          <span>Built to catch what shouldn&apos;t have been said.</span>
        </div>
      </div>
    </footer>
  );
}
