import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import { useVoiceStore } from '../store/voice';
import VoiceRoom from '../components/VoiceRoom';

interface Message {
  id: string;
  content?: string;
  createdAt: string;
  deletedAt?: string;
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
  const joined = currentRoom?.channelId === channelId;
  const participantList = useMemo(() => Object.values(participants), [participants]);

  async function loadMessages() {
    if (!channelId || channel?.type !== 'TEXT') return;
    const { data } = await api.get(`/channels/${channelId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    loadMessages();
  }, [channelId, channel?.type]);

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
    setMessages((prev) => [...prev, data.message]);
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
