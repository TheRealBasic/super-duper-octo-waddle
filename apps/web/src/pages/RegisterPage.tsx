import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function RegisterPage() {
  const register = useAuthStore((state) => state.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await register({ email, password, displayName });
    navigate('/');
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
      <p className="text-sm text-white/60 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-accent">
          Login
        </Link>
      </p>
    </div>
  );
}
