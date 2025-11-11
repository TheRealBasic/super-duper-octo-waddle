import { Fragment, useEffect, useMemo, useState } from 'react';
import type { WorkspaceCreateInput, WorkspaceMemberInviteInput } from '@acme/shared';
import { api } from '../../lib/api';

interface WorkspaceSummary {
  id: string;
  name: string;
  description?: string | null;
  role: string;
  createdAt: string;
}

interface WorkspaceDetail {
  id: string;
  name: string;
  description?: string | null;
  members: {
    id: string;
    role: string;
    joinedAt: string;
    user: { id: string; displayName: string; email: string };
  }[];
  integrations: {
    id: string;
    type: string;
    createdAt: string;
  }[];
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    }
  }, [selectedId]);

  async function fetchWorkspaces() {
    const { data } = await api.get<{ workspaces: WorkspaceSummary[] }>('/workspaces');
    setWorkspaces(data.workspaces);
    if (!selectedId && data.workspaces.length > 0) {
      setSelectedId(data.workspaces[0].id);
    }
  }

  async function fetchDetail(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const { data } = await api.get<{ workspace: WorkspaceDetail }>(`/workspaces/${id}`);
      setDetail(data.workspace);
    } catch (err) {
      console.error(err);
      setError('Unable to load workspace details right now.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: WorkspaceCreateInput = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
    };
    if (!payload.name) {
      setError('Workspace name is required.');
      return;
    }
    setCreating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { data } = await api.post<{ workspace: WorkspaceSummary }>('/workspaces', payload);
      setSuccessMessage('Workspace created successfully! Invite collaborators to get started.');
      await fetchWorkspaces();
      setSelectedId(data.workspace.id);
      event.currentTarget.reset();
    } catch (err) {
      console.error(err);
      setError('Could not create the workspace.');
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const formData = new FormData(event.currentTarget);
    const payload: WorkspaceMemberInviteInput = {
      email: formData.get('email') as string,
      role: (formData.get('role') as WorkspaceMemberInviteInput['role']) || 'MEMBER',
    };
    if (!payload.email) {
      setError('Email is required to send an invite.');
      return;
    }
    setInviting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.post(`/workspaces/${selectedId}/members`, payload);
      setSuccessMessage(`Invite sent to ${payload.email}.`);
      await fetchDetail(selectedId);
      event.currentTarget.reset();
    } catch (err) {
      console.error(err);
      setError('Unable to add that collaborator. They may not have an account yet.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedId) return;
    try {
      await api.delete(`/workspaces/${selectedId}/members/${memberId}`);
      await fetchDetail(selectedId);
    } catch (err) {
      console.error(err);
      setError('Unable to remove that member right now.');
    }
  }

  const selectedWorkspace = useMemo(() => workspaces.find((workspace) => workspace.id === selectedId), [selectedId, workspaces]);

  return (
    <div className="h-full overflow-y-auto bg-surface text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="flex flex-col gap-2 mb-10">
          <h1 className="text-3xl font-semibold">Shared workspace hub</h1>
          <p className="text-white/60 max-w-2xl">
            Coordinate long-running projects, centralize briefs, and align collaborators with modular workspaces.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm uppercase tracking-widest text-white/50">Your workspaces</h2>
              <div className="mt-4 space-y-2">
                {workspaces.length === 0 ? (
                  <p className="text-sm text-white/50">No workspaces yet. Create one to kick off collaboration.</p>
                ) : (
                  workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => setSelectedId(workspace.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selectedId === workspace.id ? 'border-accent bg-accent/10' : 'border-transparent bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="block font-medium">{workspace.name}</span>
                      <span className="block text-xs text-white/50">Role: {workspace.role}</span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5">
              <h2 className="text-sm font-semibold text-white">Create a workspace</h2>
              <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-3">
                <input
                  name="name"
                  placeholder="Workspace name"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-full bg-accent py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create workspace'}
                </button>
              </form>
            </section>
          </aside>

          <main className="space-y-6">
            {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            )}

            {selectedWorkspace && detail && !loadingDetail ? (
              <Fragment>
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
                  <h2 className="text-2xl font-semibold">{detail.name}</h2>
                  {detail.description && <p className="text-white/70 text-sm">{detail.description}</p>}
                  <p className="text-xs uppercase tracking-widest text-white/40">Members</p>
                  <div className="mt-3 space-y-3">
                    {detail.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                        <div>
                          <p className="font-medium">{member.user.displayName}</p>
                          <p className="text-xs text-white/50">{member.user.email}</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                            {member.role}
                          </span>
                          {selectedWorkspace.role === 'OWNER' && member.role !== 'OWNER' && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-white/50 hover:text-red-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {(selectedWorkspace.role === 'OWNER' || selectedWorkspace.role === 'ADMIN') && (
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-lg font-semibold">Invite collaborators</h3>
                    <p className="text-sm text-white/60 mt-1">
                      Anyone you invite will gain access to workspace templates, shared docs, and notifications.
                    </p>
                    <form onSubmit={handleInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr,160px,120px]">
                      <input
                        name="email"
                        type="email"
                        placeholder="Collaborator email"
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <select
                        name="role"
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        defaultValue="MEMBER"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        type="submit"
                        disabled={inviting}
                        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {inviting ? 'Sending…' : 'Send invite'}
                      </button>
                    </form>
                  </section>
                )}

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-lg font-semibold">Integrations</h3>
                  {detail.integrations.length === 0 ? (
                    <p className="text-sm text-white/60 mt-2">
                      No integrations connected yet. Head to settings to hook up Slack or Google Drive.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {detail.integrations.map((integration) => (
                        <div key={integration.id} className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
                          {integration.type.replace('_', ' ')} · connected {new Date(integration.createdAt).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </Fragment>
            ) : loadingDetail ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Loading workspace…</div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
                Select a workspace or create a new one to view details.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
