import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OnboardingPreferencesInput } from '@acme/shared';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<OnboardingPreferencesInput | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.onboarded) {
      navigate('/dashboard', { replace: true });
      return;
    }
    api
      .get('/preferences')
      .then(({ data }) => {
        setPreferences(data.preferences);
      })
      .catch(() => setPreferences(undefined))
      .finally(() => setLoading(false));
  }, [navigate, user?.onboarded]);

  async function handleComplete(values: OnboardingPreferencesInput) {
    setSaving(true);
    setError(null);
    try {
      await api.post('/preferences', values);
      await useAuthStore.getState().hydrate();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setError('We hit a snag saving your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-5xl w-full text-center mb-12">
        <p className="text-accent uppercase tracking-widest text-xs">Welcome aboard</p>
        <h1 className="text-4xl font-semibold text-white mt-3">Let’s personalize your HQ</h1>
        <p className="text-white/70 mt-3">
          Share a little about how you collaborate so we can tailor dashboards, workspace suggestions, and notifications.
        </p>
      </div>
      {error && <div className="mb-6 text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="text-white/70">Loading your preferences...</div>
      ) : (
        <OnboardingWizard initialPreferences={preferences} onComplete={handleComplete} loading={saving} />
      )}
    </div>
  );
}
