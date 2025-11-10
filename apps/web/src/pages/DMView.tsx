import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import { api } from '../lib/api';
import { useVoiceStore } from '../store/voice';
import VoiceRoom from '../components/VoiceRoom';

interface Message {
  id: string;
  content?: string;
  createdAt: string;
  deletedAt?: string;
  author: { displayName: string };
}

export default function DMView() {
  const { threadId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const {
    currentRoom,
    participants,
    audioEnabled,
    videoEnabled,
    joining,
    joinThread,
    leave,
    toggleMute,
    toggleVideo,
  } = useVoiceStore((state) => ({
    currentRoom: state.currentRoom,
    participants: state.participants,
    audioEnabled: state.audioEnabled,
    videoEnabled: state.videoEnabled,
    joining: state.joining,
    joinThread: state.joinThread,
    leave: state.leave,
    toggleMute: state.toggleMute,
    toggleVideo: state.toggleVideo,
  }));
  const joined = currentRoom?.threadId === threadId;
  const participantList = useMemo(() => Object.values(participants), [participants]);

  async function loadMessages() {
    if (!threadId) return;
    const { data } = await api.get(`/dms/${threadId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    loadMessages();
  }, [threadId]);

  useEffect(() => {
    if (currentRoom?.threadId && currentRoom.threadId !== threadId) {
      void leave();
    }
  }, [currentRoom?.threadId, threadId, leave]);

  async function handleSend(content: string, file?: File) {
    if (!threadId) return;
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
    const { data } = await api.post(`/dms/${threadId}/messages`, {
      content,
      attachments,
    });
    setMessages((prev) => [...prev, data.message]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 h-80 overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <VoiceRoom
          joined={Boolean(joined)}
          joining={joining}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          participants={participantList}
          onJoinAudio={() => threadId && joinThread(threadId, false)}
          onJoinVideo={() => threadId && joinThread(threadId, true)}
          onLeave={() => void leave()}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <MessageList messages={messages} />
        <MessageComposer onSubmit={handleSend} />
      </div>
    </div>
  );
}
