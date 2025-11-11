import { useEffect, useState } from 'react';
import type { IntegrationProvider } from '@acme/shared';
import { api } from '../../lib/api';

interface WorkspaceSummary {
  id: string;
  name: string;
}

interface IntegrationSummary {
  id: string;
  type: string;
  createdAt: string;
}

export default function IntegrationSettingsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ workspaces: WorkspaceSummary[] }>('/workspaces').then(({ data }) => {
      setWorkspaces(data.workspaces);
      if (data.workspaces.length > 0) {
        setSelectedWorkspaceId(data.workspaces[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setIntegrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<{ integrations: IntegrationSummary[] }>(`/integrations`, { params: { workspaceId: selectedWorkspaceId } })
      .then(({ data }) => setIntegrations(data.integrations))
      .finally(() => setLoading(false));
  }, [selectedWorkspaceId]);

  async function connectIntegration(type: IntegrationProvider) {
    if (!selectedWorkspaceId) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/integrations', {
        workspaceId: selectedWorkspaceId,
        type,
        settings: { linkedAt: new Date().toISOString() },
      });
      setMessage(`${type === 'SLACK' ? 'Slack' : 'Google Drive'} connected.`);
      await refreshIntegrations();
    } catch (err) {
      console.error(err);
      setMessage('Unable to connect that integration. Ensure you have workspace permissions.');
    } finally {
      setSaving(false);
    }
  }

  async function disconnectIntegration(id: string) {
    await api.delete(`/integrations/${id}`);
    await refreshIntegrations();
  }

  async function refreshIntegrations() {
    if (!selectedWorkspaceId) return;
    const { data } = await api.get<{ integrations: IntegrationSummary[] }>(`/integrations`, {
      params: { workspaceId: selectedWorkspaceId },
    });
    setIntegrations(data.integrations);
  }

  return (
    <div className="h-full overflow-y-auto bg-surface text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Integration control center</h1>
          <p className="text-sm text-white/60">
            Connect core tools to streamline handoffs and keep conversations close to the work.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Choose workspace</h2>
              <p className="text-xs text-white/50">Only spaces where you’re an admin or owner can manage integrations.</p>
            </div>
            <select
              value={selectedWorkspaceId ?? ''}
              onChange={(event) => setSelectedWorkspaceId(event.target.value || null)}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {workspaces.length === 0 && <option value="">No workspaces available</option>}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          {message && <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/70">{message}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => connectIntegration('SLACK')}
              disabled={saving || !selectedWorkspaceId}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-accent disabled:opacity-60"
            >
              <h3 className="text-lg font-semibold">Slack</h3>
              <p className="text-sm text-white/60 mt-2">
                Sync channels for real-time updates and pipe important messages directly into threads.
              </p>
            </button>
            <button
              onClick={() => connectIntegration('GOOGLE_DRIVE')}
              disabled={saving || !selectedWorkspaceId}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-accent disabled:opacity-60"
            >
              <h3 className="text-lg font-semibold">Google Drive</h3>
              <p className="text-sm text-white/60 mt-2">
                Attach project docs and automatically surface relevant files alongside discussions.
              </p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Connected integrations</h2>
          {loading ? (
            <div className="mt-4 text-sm text-white/60">Checking integrations…</div>
          ) : integrations.length === 0 ? (
            <p className="mt-4 text-sm text-white/60">No integrations yet. Connect a tool to get started.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-medium">{integration.type.replace('_', ' ')}</p>
                    <p className="text-xs text-white/50">Connected {new Date(integration.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => disconnectIntegration(integration.id)}
                    className="text-sm text-white/60 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
