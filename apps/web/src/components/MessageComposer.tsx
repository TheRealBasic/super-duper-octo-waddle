import { FormEvent, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface MessageComposerProps {
  onSubmit: (content: string, file?: File) => Promise<void>;
}

export default function MessageComposer({ onSubmit }: MessageComposerProps) {
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() && !file) return;
    setLoading(true);
    await onSubmit(value, file);
    setValue('');
    setFile(undefined);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/5 p-4 flex items-center gap-3">
      <label className="p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer">
        <Paperclip className="w-5 h-5" />
        <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0])} />
      </label>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Message..."
        className="flex-1 bg-white/10 rounded px-3 py-2 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-accent rounded text-sm font-medium disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
