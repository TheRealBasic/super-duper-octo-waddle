import { useMemo } from 'react';

interface Message {
  id: string;
  author: { displayName: string };
  content?: string;
  createdAt: string;
  deletedAt?: string;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const sorted = useMemo(() => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [messages]);
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {sorted.map((message) => (
        <div key={message.id} className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{message.author.displayName}</span>
            <span className="text-xs text-white/40">{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm text-white/90 whitespace-pre-wrap">{message.deletedAt ? 'Deleted message' : message.content}</p>
        </div>
      ))}
    </div>
  );
}
