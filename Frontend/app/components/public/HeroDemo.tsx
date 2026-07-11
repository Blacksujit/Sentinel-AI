'use client'

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';

const PROMPT = 'Who won the Nobel Prize in Physics in 2019, and what was it for?';

const RESPONSE_PARTS = [
  { text: 'The 2019 Nobel Prize in Physics was awarded entirely to ', flag: false },
  { text: 'Stephen Hawking', flag: true },
  { text: ' for proving the existence of black holes.', flag: false },
];

const CORRECTION = 'James Peebles, Michel Mayor, and Didier Queloz, for discoveries in physical cosmology and exoplanet detection.';

const STAGE = {
  TYPING: 'typing',
  STREAMING: 'streaming',
  SCANNING: 'scanning',
  FLAGGED: 'flagged',
  CORRECTED: 'corrected',
} as const;

type Stage = (typeof STAGE)[keyof typeof STAGE];

export default function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [stage, setStage] = useState<Stage>(STAGE.TYPING);
  const [typedLen, setTypedLen] = useState(0);
  const [visibleParts, setVisibleParts] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers: (number | NodeJS.Timeout)[] = [];

    let i = 0;
    const typeInterval = setInterval(() => {
      i += 1;
      setTypedLen(i);
      if (i >= PROMPT.length) clearInterval(typeInterval);
    }, 18);
    timers.push(typeInterval);

    const promptDuration = PROMPT.length * 18 + 300;

    timers.push(setTimeout(() => setStage(STAGE.STREAMING), promptDuration));
    timers.push(setTimeout(() => setVisibleParts(1), promptDuration + 250));
    timers.push(setTimeout(() => setVisibleParts(2), promptDuration + 700));
    timers.push(setTimeout(() => setVisibleParts(3), promptDuration + 950));
    timers.push(setTimeout(() => setStage(STAGE.SCANNING), promptDuration + 1300));
    timers.push(setTimeout(() => setStage(STAGE.FLAGGED), promptDuration + 2400));
    timers.push(setTimeout(() => setStage(STAGE.CORRECTED), promptDuration + 3400));

    return () => timers.forEach((t) => {
      if (typeof t === 'number') clearInterval(t);
      else clearTimeout(t);
    });
  }, [inView]);

  const scanning = stage === STAGE.SCANNING;
  const flagged = stage === STAGE.FLAGGED || stage === STAGE.CORRECTED;
  const corrected = stage === STAGE.CORRECTED;

  return (
    <div className="hero-demo" ref={ref}>
      <div className="hero-demo-chrome">
        <span className="dot dot-red" />
        <span className="dot dot-amber" />
        <span className="dot dot-green" />
        <span className="hero-demo-title">verify_exchange.json</span>
        <span className={'hero-demo-status' + (flagged ? ' is-flagged' : '')}>
          {flagged ? <AlertTriangle size={12} /> : <span className="status-dot" />}
          {flagged ? 'Hallucination found' : 'Monitoring'}
        </span>
      </div>

      <div className="hero-demo-body">
        <div className="demo-row">
          <span className="demo-label">PROMPT</span>
          <p className="demo-prompt">
            {PROMPT.slice(0, typedLen)}
            {typedLen < PROMPT.length && <span className="caret" />}
          </p>
        </div>

        <div className="demo-row">
          <span className="demo-label">RESPONSE</span>
          <p className="demo-response">
            <AnimatePresence>
              {visibleParts >= 1 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {RESPONSE_PARTS[0].text}
                </motion.span>
              )}
              {visibleParts >= 2 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={'claim-span' + (flagged ? ' is-struck' : '')}
                >
                  {RESPONSE_PARTS[1].text}
                </motion.span>
              )}
              {visibleParts >= 3 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {RESPONSE_PARTS[2].text}
                </motion.span>
              )}
            </AnimatePresence>
          </p>

          <AnimatePresence>
            {corrected && (
              <motion.p
                className="demo-correction"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <Check size={14} className="correction-icon" />
                <span>{CORRECTION}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="demo-row demo-meta-row">
          <div className="demo-meta">
            <span className="demo-label">TRUST SCORE</span>
            <div className="score-track">
              <motion.div
                className={'score-fill' + (flagged ? ' is-bad' : '')}
                initial={{ width: '4%' }}
                animate={{ width: scanning ? '60%' : flagged ? '91%' : '4%' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
              />
            </div>
            <span className={'score-value' + (flagged ? ' is-bad' : '')}>
              {flagged ? '91' : scanning ? '\u2026' : '\u2014'}
            </span>
          </div>

          <AnimatePresence>
            {flagged && (
              <motion.div
                className="demo-flag-tag"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                Unsupported Claim · critical
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
