import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useAppStore } from '../store/app';
import { useRealtimeStore } from '../store/realtime';
import { Plus, LogOut, MessageCircle, Hash, Mic, LayoutDashboard, Users, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../lib/api';

export default function AppLayout() {
  const servers = useAppStore((state) => state.servers);
  const channels = useAppStore((state) => state.channels);
  const dmThreads = useAppStore((state) => state.dmThreads);
  const fetchServers = useAppStore((state) => state.fetchServers);
  const fetchServerDetail = useAppStore((state) => state.fetchServerDetail);
  const fetchDMs = useAppStore((state) => state.fetchDMs);
  const { user, logout } = useAuthStore();
  const connect = useRealtimeStore((state) => state.connect);
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServers();
    fetchDMs();
    connect();
  }, [fetchServers, fetchDMs, connect]);

  const isServerRoute = location.pathname.startsWith('/servers');
  const isDMRoute = location.pathname.startsWith('/dms');

  useEffect(() => {
    const serverId = params.serverId;
    if (serverId) {
      fetchServerDetail(serverId);
    }
  }, [params.serverId, fetchServerDetail]);

  useEffect(() => {
    if (!isServerRoute) return;
    if (!params.serverId && servers.length > 0) {
      const firstServer = servers[0];
      fetchServerDetail(firstServer.id).then(() => {
        const firstChannel = useAppStore.getState().channels[firstServer.id]?.[0];
        if (firstChannel) {
          navigate(`/servers/${firstServer.id}/channels/${firstChannel.id}`, { replace: true });
        }
      });
    }
  }, [params.serverId, servers, navigate, fetchServerDetail, isServerRoute]);

  const currentServerId = isServerRoute ? params.serverId ?? servers[0]?.id : params.serverId ?? servers[0]?.id;
  const serverChannels = isServerRoute && currentServerId ? channels[currentServerId] ?? [] : [];
  const isCollaborativeView = isServerRoute || isDMRoute;

  async function handleCreateServer() {
    const name = prompt('Server name');
    if (!name) return;
    await api.post('/servers', { name });
    await fetchServers();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-white">
      <aside className="w-20 bg-sidebar border-r border-white/5 flex flex-col items-center py-4 space-y-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              isActive ? 'bg-accent text-white' : 'bg-white/10 hover:bg-white/20'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
        </NavLink>
        <NavLink
          to="/workspaces"
          className={({ isActive }) =>
            `w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              isActive ? 'bg-accent text-white' : 'bg-white/10 hover:bg-white/20'
            }`
          }
        >
          <Users className="w-5 h-5" />
        </NavLink>
        <NavLink
          to={dmThreads[0] ? `/dms/${dmThreads[0].id}` : '#'}
          className={({ isActive }) =>
            `w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              isActive ? 'bg-accent text-white' : 'bg-white/10 hover:bg-white/20'
            } ${dmThreads.length === 0 ? 'opacity-50 pointer-events-none' : ''}`
          }
        >
          <MessageCircle className="w-5 h-5" />
        </NavLink>
        <div className="w-10 border-t border-white/10" />
        {servers.map((server) => (
          <Link
            key={server.id}
            to={`/servers/${server.id}/channels/${channels[server.id]?.[0]?.id ?? ''}`}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              currentServerId === server.id && isServerRoute ? 'bg-accent text-white' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {server.name[0]}
          </Link>
        ))}
        <button
          onClick={handleCreateServer}
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 hover:bg-white/20"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              isActive ? 'bg-accent text-white' : 'bg-white/10 hover:bg-white/20'
            }`
          }
        >
          <SettingsIcon className="w-5 h-5" />
        </NavLink>
      </aside>
      {isCollaborativeView && (
        <aside className="w-72 bg-sidebar border-r border-white/5 flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="font-semibold">{servers.find((s) => s.id === currentServerId)?.name ?? 'Servers'}</span>
          </div>
          <nav className="flex-1 overflow-y-auto">
            <div className="p-3">
              <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Channels</h2>
              <ul className="space-y-1">
                {serverChannels.map((channel) => (
                  <li key={channel.id}>
                    <Link
                      to={`/servers/${channel.serverId}/channels/${channel.id}`}
                      className={`block rounded px-3 py-2 text-sm transition ${
                        location.pathname.includes(channel.id)
                          ? 'bg-accent/30 text-white'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {channel.type === 'VOICE' ? <Mic className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                        <span>{channel.name}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-3 pb-3">
              <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Direct Messages</h2>
              <ul className="space-y-1">
                {dmThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      to={`/dms/${thread.id}`}
                      className={`block rounded px-3 py-2 text-sm transition ${
                        location.pathname.includes(thread.id)
                          ? 'bg-accent/30 text-white'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {thread.participants.map((p) => p.displayName).join(', ')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>
      )}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6">
          <nav className="flex items-center gap-4 text-sm text-white/70">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? 'text-white font-medium' : 'hover:text-white')}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/workspaces"
              className={({ isActive }) => (isActive ? 'text-white font-medium' : 'hover:text-white')}
            >
              Workspaces
            </NavLink>
            <NavLink
              to={servers[0] ? `/servers/${servers[0].id}/channels/${channels[servers[0].id]?.[0]?.id ?? ''}` : '#'}
              className={({ isActive }) =>
                `${isActive || isServerRoute ? 'text-white font-medium' : 'hover:text-white'} ${
                  servers.length === 0 ? 'pointer-events-none text-white/40' : ''
                }`
              }
            >
              Communities
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => (isActive ? 'text-white font-medium' : 'hover:text-white')}
            >
              Settings
            </NavLink>
          </nav>
          <div className="flex items-center space-x-3 text-sm">
            <span>{user?.displayName}</span>
            <button onClick={logout} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
