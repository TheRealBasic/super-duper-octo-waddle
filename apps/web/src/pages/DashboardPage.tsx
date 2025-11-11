import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ActionCard } from '../components/dashboard/ActionCard';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

interface AnalyticsSummary {
  summary: {
    servers: number;
    workspaces: number;
    directMessageThreads: number;
    messagesThisWeek: number;
    activeIntegrations: number;
    summaryFrequency: string;
    topInterests: string[];
  };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    api
      .get<AnalyticsSummary>('/analytics/summary')
      .then(({ data }) => setSummary(data.summary))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const quickActions = useMemo(
    () => [
      {
        title: 'Launch a shared workspace',
        description: 'Spin up a workspace with templates tuned to your interests and invite collaborators.',
        action: (
          <button
            onClick={() => navigate('/workspaces')}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            Open workspace hub
          </button>
        ),
      },
      {
        title: 'Connect an integration',
        description: 'Bring your Slack channels or Google Drive folders into the conversation for richer context.',
        action: (
          <button
            onClick={() => navigate('/settings/integrations')}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Manage integrations
          </button>
        ),
      },
      {
        title: 'Tune your notifications',
        description: 'Adjust digest cadence and alert surfaces so insights show up right where you work.',
        action: (
          <button
            onClick={() => navigate('/settings')}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Update preferences
          </button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="h-full overflow-y-auto bg-surface text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-4">
          <p className="text-sm text-white/60">Welcome back, {user?.displayName ?? 'friend'}.</p>
          <h1 className="text-4xl font-semibold">Your collaborative command center</h1>
          <p className="text-white/60 max-w-2xl">
            Track the momentum of your communities and workspaces, and jump into the next most impactful action.
          </p>
        </header>

        {loading ? (
          <div className="text-white/60">Loading insights…</div>
        ) : summary ? (
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Communities" value={summary.servers} trendLabel="DM threads" trendValue={`${summary.directMessageThreads}`} />
            <MetricCard label="Shared workspaces" value={summary.workspaces} trendLabel="Active integrations" trendValue={`${summary.activeIntegrations}`} />
            <MetricCard
              label="Messages this week"
              value={summary.messagesThisWeek}
              trendLabel="Digest cadence"
              trendValue={summary.summaryFrequency}
            />
          </section>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            We couldn’t load your analytics just yet. Try refreshing to give it another go.
          </div>
        )}

        <section className="space-y-4">
          {summary && summary.topInterests.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold">Focus areas</h2>
              <p className="text-sm text-white/70 mt-2">
                We’ll prioritize updates and templates around these interests:
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {summary.topInterests.map((interest) => (
                  <span key={interest} className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          {quickActions.map((action) => (
            <ActionCard key={action.title} title={action.title} description={action.description} actions={action.action} />
          ))}
        </section>
      </div>
    </div>
  );
}
