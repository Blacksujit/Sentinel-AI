'use client'

import { useState } from 'react';
import { Loader2, ArrowRight, Check } from 'lucide-react';

export default function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('investor');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      setMessage(data.message || "You're on the list.");
      setStatus('done');
    } catch {
      setMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className={'waitlist-done' + (dark ? ' is-dark' : '')}>
        <Check size={16} /> {message}
      </div>
    );
  }

  return (
    <form className={'waitlist-form' + (dark ? ' is-dark' : '')} onSubmit={handleSubmit}>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="waitlist-select"
        aria-label="I am a..."
      >
        <option value="investor">Investor</option>
        <option value="engineer">Engineer</option>
        <option value="founder">Founder</option>
        <option value="other">Other</option>
      </select>
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="waitlist-input"
        aria-label="Email address"
      />
      <button type="submit" className="btn btn-accent waitlist-btn" disabled={status === 'loading'}>
        {status === 'loading' ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}
        Request access
      </button>
      {status === 'error' && <p className="waitlist-error">{message}</p>}
    </form>
  );
}
