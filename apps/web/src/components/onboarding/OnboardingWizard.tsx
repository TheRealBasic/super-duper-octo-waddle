import { useMemo, useState } from 'react';
import type { OnboardingPreferencesInput } from '@acme/shared';

const interestOptions = ['Productivity', 'Community', 'Automations', 'Research', 'Design'];
const frequencyOptions: OnboardingPreferencesInput['summaryFrequency'][] = ['daily', 'weekly', 'monthly'];

export interface OnboardingWizardProps {
  initialPreferences?: OnboardingPreferencesInput;
  onComplete: (preferences: OnboardingPreferencesInput) => Promise<void> | void;
  loading?: boolean;
}

const defaultPreferences: OnboardingPreferencesInput = {
  role: 'Collaborator',
  interests: ['Productivity'],
  summaryFrequency: 'weekly',
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    digest: false,
  },
};

export function OnboardingWizard({ initialPreferences, onComplete, loading }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<OnboardingPreferencesInput>(initialPreferences ?? defaultPreferences);
  const steps = useMemo(
    () => [
      {
        title: 'Tell us about your role',
        description: 'We use this to tailor workspace templates and quick starts.',
      },
      {
        title: 'Pick focus areas',
        description: 'Choose up to five areas where you need the most assistance.',
      },
      {
        title: 'Configure summaries & alerts',
        description: 'Decide how often we should bundle insights and how we should notify you.',
      },
    ],
    [],
  );

  function toggleInterest(interest: string) {
    setPreferences((prev) => {
      const normalized = interest.toLowerCase();
      const hasInterest = prev.interests.map((item) => item.toLowerCase()).includes(normalized);
      if (hasInterest) {
        return {
          ...prev,
          interests: prev.interests.filter((item) => item.toLowerCase() !== normalized),
        };
      }
      if (prev.interests.length >= 5) {
        return prev;
      }
      return { ...prev, interests: [...prev.interests, interest] };
    });
  }

  async function handleSubmit() {
    await onComplete(preferences);
  }

  return (
    <div className="max-w-3xl mx-auto bg-surface border border-white/10 rounded-2xl p-10 text-white shadow-2xl">
      <div className="mb-8">
        <span className="text-xs uppercase tracking-wider text-white/40">Step {step + 1} of {steps.length}</span>
        <h1 className="text-3xl font-semibold mt-2">{steps[step].title}</h1>
        <p className="text-white/60 mt-1">{steps[step].description}</p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <label className="block text-sm text-white/70" htmlFor="role">
            Your role or specialty
          </label>
          <input
            id="role"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            value={preferences.role}
            onChange={(event) => setPreferences((prev) => ({ ...prev, role: event.target.value }))}
            placeholder="e.g. Product Manager"
          />
          <label className="block text-sm text-white/70" htmlFor="theme">
            Interface theme
          </label>
          <select
            id="theme"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            value={preferences.theme}
            onChange={(event) =>
              setPreferences((prev) => ({ ...prev, theme: event.target.value as OnboardingPreferencesInput['theme'] }))
            }
          >
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-white/70 text-sm">Select up to five focus areas.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {interestOptions.map((interest) => {
              const normalized = interest.toLowerCase();
              const isActive = preferences.interests.map((item) => item.toLowerCase()).includes(normalized);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    isActive ? 'border-accent bg-accent/20 text-white' : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  <span className="font-medium">{interest}</span>
                  <span className="block text-xs text-white/50">{isActive ? 'Added to your plan' : 'Tap to include'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-white/70 mb-3">How often should we deliver rollups?</p>
            <div className="flex flex-wrap gap-3">
              {frequencyOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPreferences((prev) => ({ ...prev, summaryFrequency: option }))}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    preferences.summaryFrequency === option
                      ? 'bg-accent text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: event.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-white/20 bg-white/10"
              />
              Email summaries
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={preferences.notifications.push}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, push: event.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-white/20 bg-white/10"
              />
              Push alerts
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={preferences.notifications.digest}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, digest: event.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-white/20 bg-white/10"
              />
              Weekly digest
            </label>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
          disabled={step === 0 || loading}
          className="text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <div className="flex gap-2">
          {Array.from({ length: steps.length }).map((_, index) => (
            <span
              key={index}
              className={`h-2 w-2 rounded-full ${index === step ? 'bg-accent' : 'bg-white/20'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (step === steps.length - 1 ? handleSubmit() : setStep((prev) => prev + 1))}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {step === steps.length - 1 ? (loading ? 'Finishing...' : 'Finish setup') : 'Continue'}
        </button>
      </div>
    </div>
  );
}
