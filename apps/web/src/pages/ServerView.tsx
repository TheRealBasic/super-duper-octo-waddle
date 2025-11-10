import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import { useVoiceStore } from '../store/voice';
import VoiceRoom from '../components/VoiceRoom';
import { useRealtimeStore } from '../store/realtime';

interface Message {
  id: string;
  channelId?: string | null;
  threadId?: string | null;
  content?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  author: { displayName: string };
}

export default function ServerView() {
  const { channelId, serverId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const channel = useAppStore(
    (state) =>
      (serverId && channelId && state.channels[serverId]?.find((c) => c.id === channelId)) || undefined,
  );
  const {
    currentRoom,
    participants,
    audioEnabled,
    videoEnabled,
    joining,
    joinChannel,
    leave,
    toggleMute,
    toggleVideo,
  } = useVoiceStore((state) => ({
    currentRoom: state.currentRoom,
    participants: state.participants,
    audioEnabled: state.audioEnabled,
    videoEnabled: state.videoEnabled,
    joining: state.joining,
    joinChannel: state.joinChannel,
    leave: state.leave,
    toggleMute: state.toggleMute,
    toggleVideo: state.toggleVideo,
  }));
  const socket = useRealtimeStore((state) => state.socket);
  const joined = currentRoom?.channelId === channelId;
  const participantList = useMemo(() => Object.values(participants), [participants]);

  function normalizeMessage(message: any): Message {
    return {
      id: message.id,
      channelId: message.channelId ?? null,
      threadId: message.threadId ?? null,
      content: message.content ?? null,
      createdAt: message.createdAt,
      deletedAt: message.deletedAt ?? null,
      author: { displayName: message.author?.displayName ?? 'Unknown User' },
    };
  }

  function mergeMessage(list: Message[], incoming: Message) {
    const index = list.findIndex((item) => item.id === incoming.id);
    if (index === -1) {
      return [...list, incoming];
    }
    const next = [...list];
    next[index] = { ...next[index], ...incoming };
    return next;
  }

  async function loadMessages() {
    if (!channelId || channel?.type !== 'TEXT') return;
    const { data } = await api.get(`/channels/${channelId}/messages`);
    setMessages(data.messages.map(normalizeMessage));
  }

  useEffect(() => {
    loadMessages();
  }, [channelId, channel?.type]);

  useEffect(() => {
    if (!socket || !channelId || !channel) return;
    if (channel.type !== 'TEXT') {
      socket.emit('channel.leave', channelId);
      return;
    }
    socket.emit('channel.join', channelId);
    return () => {
      socket.emit('channel.leave', channelId);
    };
  }, [socket, channelId, channel]);

  useEffect(() => {
    if (!socket || !channelId || channel?.type !== 'TEXT') return;

    const handleCreated = (message: any) => {
      if (message.channelId !== channelId) return;
      setMessages((prev) => mergeMessage(prev, normalizeMessage(message)));
    };

    const handleUpdated = (message: any) => {
      if (message.channelId !== channelId) return;
      setMessages((prev) => mergeMessage(prev, normalizeMessage(message)));
    };

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, deletedAt: new Date().toISOString(), content: null }
            : msg,
        ),
      );
    };

    socket.on('message.created', handleCreated);
    socket.on('message.updated', handleUpdated);
    socket.on('message.deleted', handleDeleted);

    return () => {
      socket.off('message.created', handleCreated);
      socket.off('message.updated', handleUpdated);
      socket.off('message.deleted', handleDeleted);
    };
  }, [socket, channelId, channel?.type]);

  useEffect(() => {
    if (currentRoom?.channelId && currentRoom.channelId !== channelId) {
      void leave();
    }
  }, [currentRoom?.channelId, channelId, leave]);

  async function handleSend(content: string, file?: File) {
    if (!channelId || channel?.type !== 'TEXT') return;
    let attachments: { url: string; mime: string; size: number }[] = [];
    if (file) {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      attachments = [
        {
          url: data.url,
          mime: file.type,
          size: file.size,
        },
      ];
    }
    const { data } = await api.post(`/channels/${channelId}/messages`, {
      content,
      attachments,
    });
    setMessages((prev) => mergeMessage(prev, normalizeMessage(data.message)));
  }

  if (channel?.type === 'VOICE' && channelId) {
    return (
      <VoiceRoom
        joined={joined}
        joining={joining}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        participants={participantList}
        onJoinAudio={() => joinChannel(channelId, false)}
        onJoinVideo={() => joinChannel(channelId, true)}
        onLeave={() => void leave()}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} />
      <MessageComposer onSubmit={handleSend} />
    </div>
  );
}
