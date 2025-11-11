import { useEffect, useMemo, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';

type Participant = {
  userId: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  isLocal?: boolean;
};

interface VoiceRoomProps {
  joined: boolean;
  joining: boolean;
  participants: Participant[];
  audioEnabled: boolean;
  videoEnabled: boolean;
  onJoinAudio: () => void;
  onJoinVideo: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

function ParticipantTile({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (participant.stream && videoRef.current) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
    }
  }, [participant.stream]);
  useEffect(() => {
    if (!participant.isLocal && participant.stream && audioRef.current) {
      audioRef.current.srcObject = participant.stream;
      const play = () => {
        audioRef.current?.play().catch(() => undefined);
      };
      play();
    }
  }, [participant.stream, participant.isLocal]);
  const label = participant.isLocal ? 'You' : participant.userId.slice(0, 8);
  return (
    <div className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      {participant.videoEnabled && participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="h-40 w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-md bg-white/10 text-sm text-white/70">
          {participant.isLocal ? 'Audio only' : 'Voice' }
        </div>
      )}
      {!participant.isLocal && <audio ref={audioRef} autoPlay hidden />}
      <div className="mt-2 text-center text-xs font-medium text-white/80">{label}</div>
    </div>
  );
}

export default function VoiceRoom(props: VoiceRoomProps) {
  const participantList = useMemo(() => props.participants, [props.participants]);
  if (!props.joined) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-white/70">Join the call to start talking with your friends.</p>
        <div className="flex gap-3">
          <button
            onClick={props.onJoinAudio}
            disabled={props.joining}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            <Phone className="h-4 w-4" /> Join Voice
          </button>
          <button
            onClick={props.onJoinVideo}
            disabled={props.joining}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
          >
            <Video className="h-4 w-4" /> Join with Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex gap-3">
          <button
            onClick={props.onToggleMute}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            {props.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />} 
            {props.audioEnabled ? 'Mute' : 'Unmute'}
          </button>
          <button
            onClick={props.onToggleVideo}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            {props.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />} 
            {props.videoEnabled ? 'Disable Video' : 'Enable Video'}
          </button>
        </div>
        <button
          onClick={props.onLeave}
          className="inline-flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          <PhoneOff className="h-4 w-4" /> Leave
        </button>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
        {participantList.length === 0 && (
          <div className="col-span-full flex h-full items-center justify-center rounded-lg border border-dashed border-white/20 text-sm text-white/60">
            Waiting for others to join…
          </div>
        )}
        {participantList.map((participant) => (
          <ParticipantTile key={participant.userId} participant={participant} />
        ))}
      </div>
    </div>
  );
}
