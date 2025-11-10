import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import { api } from '../lib/api';

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

  async function loadMessages() {
    if (!threadId) return;
    const { data } = await api.get(`/dms/${threadId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    loadMessages();
  }, [threadId]);

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
      <MessageList messages={messages} />
      <MessageComposer onSubmit={handleSend} />
    </div>
  );
}
