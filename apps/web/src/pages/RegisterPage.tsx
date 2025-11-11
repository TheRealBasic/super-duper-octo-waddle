import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { requestIdToken } from '../lib/oauth';
import { AppleIcon, GoogleIcon } from '../components/SocialIcons';

export default function RegisterPage() {
  const register = useAuthStore((state) => state.register);
  const oauth = useAuthStore((state) => state.oauth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await register({ email, password, displayName });
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register with email.';
      setError(message);
    }
  }

  async function handleOAuth(provider: 'GOOGLE' | 'APPLE') {
    setError(null);
    const label = provider === 'GOOGLE' ? 'Google' : 'Apple';
    const token = requestIdToken(provider);

    if (!token) {
      setError(`Unable to start ${label} sign up.`);
      return;
    }

    try {
      await oauth({ provider, idToken: token });
      navigate('/');
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : `Unable to continue with ${label}.`;
      setError(message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-white/70">Display name</label>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <button type="submit" className="w-full bg-accent py-2 rounded font-semibold">
          Register
        </button>
      </form>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      <div className="flex items-center gap-4 text-white/40 mt-6">
        <span className="h-px flex-1 bg-white/20" />
        <span className="text-xs uppercase tracking-wide">Or continue with</span>
        <span className="h-px flex-1 bg-white/20" />
      </div>
      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={() => handleOAuth('GOOGLE')}
          className="w-full flex items-center justify-center gap-2 rounded border border-white/20 py-2 font-semibold hover:border-white/40 transition"
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('APPLE')}
          className="w-full flex items-center justify-center gap-2 rounded border border-white/20 py-2 font-semibold hover:border-white/40 transition"
        >
          <AppleIcon className="h-4 w-4" />
          Continue with Apple
        </button>
      </div>
      <p className="text-sm text-white/60 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-accent">
          Login
        </Link>
      </p>
    </div>
  );
}
