import { createContext, useContext, type ReactNode } from 'react';
import { useVoiceChat, type VoicePeer } from '@/hooks/useVoiceChat';

interface VoiceChatContextValue {
  isInVoice: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  peers: VoicePeer[];
  micError: string | null;
  localStream: MediaStream | null;
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextValue | null>(null);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
  const voice = useVoiceChat();
  return (
    <VoiceChatContext.Provider value={voice}>
      {children}
    </VoiceChatContext.Provider>
  );
}

export function useVoiceChatContext(): VoiceChatContextValue {
  const ctx = useContext(VoiceChatContext);
  if (!ctx) throw new Error('useVoiceChatContext must be used within VoiceChatProvider');
  return ctx;
}
