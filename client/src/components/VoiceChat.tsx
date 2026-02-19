import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceChatContext } from '@/contexts/VoiceChatContext';
import { useGameStore } from '@/store/gameStore';

interface VoiceChatProps {
  compact?: boolean;
}

export function VoiceChat({ compact = false }: VoiceChatProps) {
  const { isInVoice, isMuted, peers, micError, joinVoice, leaveVoice, toggleMute } = useVoiceChatContext();
  const players = useGameStore((s) => s.players);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {!isInVoice ? (
          <button
            onClick={joinVoice}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[0.65rem] font-medium hover:bg-green-500/30 transition-colors"
            title="Join voice chat"
          >
            <MicIcon size={12} />
            <span>Join Call</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-medium transition-colors ${
                isMuted
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-green-500/20 border border-green-500/30 text-green-400'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOffIcon size={12} /> : <MicIcon size={12} />}
            </button>
            <div className="flex -space-x-1">
              {peers.map((p) => (
                <div
                  key={p.peerId}
                  className="w-5 h-5 rounded-full bg-green-500/30 border border-green-500/40 flex items-center justify-center text-[0.5rem] text-green-300"
                  title={p.name}
                >
                  🎤
                </div>
              ))}
            </div>
            <span className="text-[0.55rem] text-white/40">{peers.length + 1}</span>
            <button
              onClick={leaveVoice}
              className="flex items-center px-1.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[0.65rem] hover:bg-red-500/30 transition-colors"
              title="Leave voice chat"
            >
              <PhoneOffIcon size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-sm font-medium flex items-center gap-1.5">
          <MicIcon size={14} />
          Voice Chat
        </h3>
        {isInVoice && (
          <span className="text-[0.6rem] text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {micError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          >
            {micError}
          </motion.div>
        )}
      </AnimatePresence>

      {!isInVoice ? (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={joinVoice}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors"
        >
          <MicIcon size={16} />
          Join Room Call
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {/* Participants */}
          <div className="space-y-1.5">
            {/* Self */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
              <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
              <span className="text-xs text-white/80 flex-1">You</span>
              <span className="text-[0.6rem] text-white/30">{isMuted ? 'Muted' : 'Speaking'}</span>
            </div>

            {/* Remote peers */}
            {peers.map((peer) => {
              const player = players.find((_, i) => i === peer.seatIndex);
              return (
                <div key={peer.peerId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <div className={`w-2 h-2 rounded-full ${peer.hasAudio ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/80 flex-1 truncate">
                    {peer.name || player?.name || `Seat ${peer.seatIndex + 1}`}
                  </span>
                  <span className="text-[0.6rem] text-white/30">
                    {peer.hasAudio ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              );
            })}

            {peers.length === 0 && (
              <div className="text-center text-white/20 text-xs py-2">
                No one else in voice yet
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                isMuted
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                  : 'bg-white/10 border border-white/15 text-white/70 hover:bg-white/15'
              }`}
            >
              {isMuted ? <MicOffIcon size={14} /> : <MicIcon size={14} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={leaveVoice}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors"
            >
              <PhoneOffIcon size={14} />
              Leave Call
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Inline SVG icons to avoid extra dependencies
function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5.29" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function PhoneOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="22" x2="2" y1="2" y2="22" />
    </svg>
  );
}
