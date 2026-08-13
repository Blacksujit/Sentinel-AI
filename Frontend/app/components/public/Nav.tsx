'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, X, ArrowRight, Star, Coffee } from 'lucide-react';
import BrandMark from './BrandMark';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/docs', label: 'Docs' },
];

const GITHUB_REPO = 'https://github.com/Blacksujit/Sentinel-AI';
const SPONSORS = 'https://github.com/sponsors/Blacksujit';

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    html.setAttribute('data-theme', resolvedTheme === 'dark' ? 'dark' : 'cream');
  }, [mounted, resolvedTheme]);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const isDark = mounted && resolvedTheme === 'dark';

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname?.startsWith(to) ?? false;
  };

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <BrandMark />
          SentinelAI
        </Link>

        <ul className="nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                href={link.to}
                className={'nav-link' + (isActive(link.to) ? ' active' : '')}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-right">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="nav-social"
            aria-label="Star SentinelAI on GitHub"
          >
            <Star size={15} />
            Star
          </a>
          <a
            href={SPONSORS}
            target="_blank"
            rel="noreferrer"
            className="nav-social"
            aria-label="Buy us a coffee"
          >
            <Coffee size={15} />
            Buy us a coffee
          </a>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to cream mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/start" className="nav-cta">
            Get started <ArrowRight size={14} />
          </Link>
          <button
            className="nav-burger"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              className="mobile-link"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="mobile-link"
            onClick={() => setOpen(false)}
          >
            <Star size={15} />
            Star on GitHub
          </a>
          <a
            href={SPONSORS}
            target="_blank"
            rel="noreferrer"
            className="mobile-link"
            onClick={() => setOpen(false)}
          >
            <Coffee size={15} />
            Buy us a coffee
          </a>
        </div>
      )}
    </header>
  );
}
