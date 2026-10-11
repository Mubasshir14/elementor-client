'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';

export function AuthCard({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'login') {
        const session = await apiClient.signIn(email, password);
        apiClient.setToken(session.token);
        window.location.href = '/dashboard';
        return;
      }

      const session = await apiClient.register(email, password);
      apiClient.setToken(session.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">{mode === 'login' ? 'Welcome back' : 'Create account'}</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{mode === 'login' ? 'Sign in' : 'Register'}</h1>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={12}
            maxLength={128}
            required
          />
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
        <Link href={mode === 'login' ? '/register' : '/login'} className="font-semibold text-brand-600 hover:text-brand-700">
          {mode === 'login' ? 'Create one' : 'Sign in'}
        </Link>
      </p>
    </div>
  );
}
