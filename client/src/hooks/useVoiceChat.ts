import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import type { VoiceJoinedPayload, VoiceLeftPayload, VoicePeersPayload, VoiceSignalPayload } from '@shared/types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface PeerInfo {
  seatIndex: number;
  name: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export interface VoicePeer {
  peerId: string;
  seatIndex: number;
  name: string;
  hasAudio: boolean;
  stream: MediaStream | null;
}

export function useVoiceChat() {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const isInVoiceRef = useRef(false);
  const isVideoOnRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerInfo>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  // Track peers we know about from voice:joined but haven't connected to yet
  const pendingPeersRef = useRef<Map<string, { seatIndex: number; name: string }>>(new Map());

  // Sync peers state from ref
  const syncPeers = useCallback(() => {
    const list: VoicePeer[] = [];
    for (const [peerId, info] of peersRef.current) {
      list.push({
        peerId,
        seatIndex: info.seatIndex,
        name: info.name,
        hasAudio: !!info.stream,
        stream: info.stream || null,
      });
    }
    setPeers(list);
  }, []);

  // Create a peer connection for a remote peer
  const createPeerConnection = useCallback((peerId: string, seatIndex: number, name: string): RTCPeerConnection => {
    const socket = getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          to: peerId,
          signal: event.candidate.toJSON(),
          type: 'ice-candidate',
        });
      }
    };

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const peerInfo = peersRef.current.get(peerId);
      if (peerInfo) {
        peerInfo.stream = remoteStream;
      }

      // Play audio through an audio element
      let audioEl = audioElementsRef.current.get(peerId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        audioElementsRef.current.set(peerId, audioEl);
      }
      audioEl.srcObject = remoteStream;

      syncPeers();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log(`[Voice] Connection ${pc.connectionState} with peer ${peerId}`);
      }
    };

    peersRef.current.set(peerId, { seatIndex, name, connection: pc });
    syncPeers();
    return pc;
  }, [syncPeers]);

  // Clean up a single peer connection
  const removePeer = useCallback((peerId: string) => {
    const peerInfo = peersRef.current.get(peerId);
    if (peerInfo) {
      peerInfo.connection.close();
      peersRef.current.delete(peerId);
    }
    const audioEl = audioElementsRef.current.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioElementsRef.current.delete(peerId);
    }
    syncPeers();
  }, [syncPeers]);

  // Clean up all connections
  const cleanupAll = useCallback(() => {
    for (const [peerId] of peersRef.current) {
      removePeer(peerId);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setPeers([]);
  }, [removePeer]);

  // Join voice chat
  const joinVoice = useCallback(async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      isInVoiceRef.current = true;
      setIsInVoice(true);
      setLocalStream(stream);

      const socket = getSocket();
      socket.emit('voice:join');
    } catch (err: any) {
      console.error('[Voice] Mic access error:', err);
      setMicError('Could not access microphone. Please allow mic permission.');
    }
  }, []);

  // Leave voice chat
  const leaveVoice = useCallback(() => {
    const socket = getSocket();
    socket.emit('voice:leave');
    cleanupAll();
    isInVoiceRef.current = false;
    isVideoOnRef.current = false;
    setIsInVoice(false);
    setIsMuted(false);
    setIsVideoOn(false);
    setLocalStream(null);
  }, [cleanupAll]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!isInVoiceRef.current || !localStreamRef.current) return;

    const existingVideoTrack = localStreamRef.current.getVideoTracks()[0];

    if (existingVideoTrack && isVideoOnRef.current) {
      // Turn OFF: stop the track completely so camera LED turns off
      existingVideoTrack.stop();
      localStreamRef.current.removeTrack(existingVideoTrack);

      // Remove video sender from all peer connections
      for (const [, peerInfo] of peersRef.current) {
        const senders = peerInfo.connection.getSenders();
        for (const sender of senders) {
          if (sender.track === existingVideoTrack || sender.track?.kind === 'video') {
            try { peerInfo.connection.removeTrack(sender); } catch (e) { /* ignore */ }
          }
        }
      }

      isVideoOnRef.current = false;
      setIsVideoOn(false);
      setLocalStream(localStreamRef.current);
    } else {
      // Turn ON: request fresh camera and add video track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(videoTrack);

        // Add video track to all existing peer connections and renegotiate
        const socket = getSocket();
        for (const [peerId, peerInfo] of peersRef.current) {
          peerInfo.connection.addTrack(videoTrack, localStreamRef.current);
          try {
            const offer = await peerInfo.connection.createOffer();
            await peerInfo.connection.setLocalDescription(offer);
            socket.emit('voice:signal', {
              to: peerId,
              signal: offer,
              type: 'offer',
            });
          } catch (err) {
            console.error('[Voice] Renegotiation error:', err);
          }
        }

        isVideoOnRef.current = true;
        setIsVideoOn(true);
        setLocalStream(localStreamRef.current);
      } catch (err) {
        console.error('[Voice] Camera access error:', err);
        setMicError('Could not access camera. Please allow camera permission.');
      }
    }
  }, []);

  // Socket event handlers
  useEffect(() => {
    const socket = getSocket();

    // When we receive the list of existing peers (after joining voice)
    const onVoicePeers = async (data: VoicePeersPayload) => {
      for (const peer of data.peers) {
        // We are the newcomer, so we create offers to all existing peers
        const pc = createPeerConnection(peer.peerId, peer.seatIndex, peer.name);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('voice:signal', {
            to: peer.peerId,
            signal: offer,
            type: 'offer',
          });
        } catch (err) {
          console.error('[Voice] Error creating offer:', err);
        }
      }
    };

    // When a new peer joins voice - store their info for when their offer arrives
    const onVoiceJoined = (data: VoiceJoinedPayload) => {
      if (!isInVoice) return;
      pendingPeersRef.current.set(data.peerId, { seatIndex: data.seatIndex, name: data.name });
      console.log(`[Voice] ${data.name} joined voice`);
    };

    // When a peer leaves voice
    const onVoiceLeft = (data: VoiceLeftPayload) => {
      removePeer(data.peerId);
      console.log(`[Voice] Seat ${data.seatIndex} left voice`);
    };

    // WebRTC signaling
    const onVoiceSignal = async (data: VoiceSignalPayload) => {
      if (!isInVoice) return;

      if (data.type === 'offer') {
        // Someone sent us an offer - create connection and answer
        let peerInfo = peersRef.current.get(data.from);
        let pc: RTCPeerConnection;
        if (!peerInfo) {
          // Use stored info from voice:joined event
          const pending = pendingPeersRef.current.get(data.from);
          pc = createPeerConnection(data.from, pending?.seatIndex ?? -1, pending?.name ?? '');
          pendingPeersRef.current.delete(data.from);
        } else {
          pc = peerInfo.connection;
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', {
            to: data.from,
            signal: answer,
            type: 'answer',
          });
        } catch (err) {
          console.error('[Voice] Error handling offer:', err);
        }
      } else if (data.type === 'answer') {
        const peerInfo = peersRef.current.get(data.from);
        if (peerInfo) {
          try {
            await peerInfo.connection.setRemoteDescription(
              new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
            );
          } catch (err) {
            console.error('[Voice] Error handling answer:', err);
          }
        }
      } else if (data.type === 'ice-candidate') {
        const peerInfo = peersRef.current.get(data.from);
        if (peerInfo) {
          try {
            await peerInfo.connection.addIceCandidate(new RTCIceCandidate(data.signal as RTCIceCandidateInit));
          } catch (err) {
            console.error('[Voice] Error adding ICE candidate:', err);
          }
        }
      }
    };

    socket.on('voice:peers', onVoicePeers);
    socket.on('voice:joined', onVoiceJoined);
    socket.on('voice:left', onVoiceLeft);
    socket.on('voice:signal', onVoiceSignal);

    return () => {
      socket.off('voice:peers', onVoicePeers);
      socket.off('voice:joined', onVoiceJoined);
      socket.off('voice:left', onVoiceLeft);
      socket.off('voice:signal', onVoiceSignal);
    };
  }, [isInVoice, createPeerConnection, removePeer]);

  // Cleanup on unmount (provider unmount = logout/page unload)
  useEffect(() => {
    return () => {
      if (isInVoiceRef.current) {
        const socket = getSocket();
        socket.emit('voice:leave');
      }
      cleanupAll();
    };
  }, []);

  return {
    isInVoice,
    isMuted,
    isVideoOn,
    peers,
    micError,
    localStream,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleVideo,
  };
}
