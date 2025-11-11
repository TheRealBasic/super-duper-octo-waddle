import { useEffect, useState } from 'react';
import type { NotificationSettingsInput, OnboardingPreferencesInput } from '@acme/shared';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

const defaultNotifications: NotificationSettingsInput = {
  email: true,
  push: true,
  digest: false,
};

const defaultPreferences: OnboardingPreferencesInput = {
  role: 'Collaborator',
  interests: ['Productivity'],
  summaryFrequency: 'weekly',
  theme: 'system',
  notifications: defaultNotifications,
};

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<OnboardingPreferencesInput>(defaultPreferences);
  const [notifications, setNotifications] = useState<NotificationSettingsInput>(defaultNotifications);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/preferences')
      .then(({ data }) => {
        setPreferences(data.preferences ?? defaultPreferences);
        setNotifications(data.notifications ?? defaultNotifications);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSavePreferences() {
    setSavingPreferences(true);
    setMessage(null);
    try {
      const payload = { ...preferences, notifications } satisfies OnboardingPreferencesInput;
      await api.post('/preferences', payload);
      await useAuthStore.getState().hydrate();
      setMessage('Workspace preferences updated.');
    } catch (err) {
      console.error(err);
      setMessage('Unable to update preferences right now.');
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    setMessage(null);
    try {
      await api.patch('/preferences/notifications', notifications);
      await useAuthStore.getState().hydrate();
      setMessage('Notification settings saved.');
    } catch (err) {
      console.error(err);
      setMessage('Unable to save notification settings.');
    } finally {
      setSavingNotifications(false);
    }
  }

  if (loading) {
    return <div className="h-full bg-surface text-white flex items-center justify-center">Loading settings…</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-surface text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Analytics & notification settings</h1>
          <p className="text-white/60 text-sm max-w-2xl">
            Review the signals we surface on your dashboard and configure how and when we notify you.
          </p>
        </header>

        {message && <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{message}</div>}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Summary preferences</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40">Role</label>
              <input
                value={preferences.role}
                onChange={(event) => setPreferences((prev) => ({ ...prev, role: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40">Digest cadence</label>
              <select
                value={preferences.summaryFrequency}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    summaryFrequency: event.target.value as OnboardingPreferencesInput['summaryFrequency'],
                  }))
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-white/40">Focus areas</label>
              <textarea
                value={preferences.interests.join(', ')}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    interests: event.target.value
                      .split(',')
                      .map((interest) => interest.trim())
                      .filter((interest) => interest.length > 0)
                      .slice(0, 5),
                  }))
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={2}
              />
              <p className="mt-2 text-xs text-white/40">Comma separate up to five focus areas.</p>
            </div>
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {savingPreferences ? 'Saving…' : 'Save summary preferences'}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(event) => setNotifications((prev) => ({ ...prev, email: event.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-white/10"
              />
              Email summaries
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(event) => setNotifications((prev) => ({ ...prev, push: event.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-white/10"
              />
              Push alerts
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={notifications.digest}
                onChange={(event) => setNotifications((prev) => ({ ...prev, digest: event.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-white/10"
              />
              Weekly digest recap
            </label>
          </div>
          <button
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-60"
          >
            {savingNotifications ? 'Saving…' : 'Save notification settings'}
          </button>
        </section>
      </div>
    </div>
  );
}
