import { useRef, useEffect, useState } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  label?: string;
  isSelf?: boolean;
}

export function VideoTile({ stream, label, isSelf = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }

    const checkVideo = () => {
      const active = stream
        ? stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
        : false;
      setHasVideo(active);
    };

    checkVideo();

    if (!stream) return;

    // Listen for tracks being added/removed/muted/unmuted
    const onTrackChange = () => checkVideo();
    stream.addEventListener('addtrack', onTrackChange);
    stream.addEventListener('removetrack', onTrackChange);
    for (const track of stream.getVideoTracks()) {
      track.addEventListener('ended', onTrackChange);
      track.addEventListener('mute', onTrackChange);
      track.addEventListener('unmute', onTrackChange);
    }

    // Poll periodically as a fallback for enabled/disabled changes
    const interval = setInterval(checkVideo, 1000);

    return () => {
      stream.removeEventListener('addtrack', onTrackChange);
      stream.removeEventListener('removetrack', onTrackChange);
      for (const track of stream.getVideoTracks()) {
        track.removeEventListener('ended', onTrackChange);
        track.removeEventListener('mute', onTrackChange);
        track.removeEventListener('unmute', onTrackChange);
      }
      clearInterval(interval);
    };
  }, [stream]);

  return (
    <div className="w-[96px] h-[72px] sm:w-[120px] sm:h-[90px] rounded-2xl overflow-hidden bg-black/70 border border-white/15 relative shadow-lg backdrop-blur-sm">
      {/* Always mount video element, toggle visibility */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={`w-full h-full object-cover ${isSelf ? '-scale-x-100' : ''} ${hasVideo ? '' : 'hidden'}`}
      />
      {!hasVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800/80 to-gray-900/80">
          <span className="text-white/25 text-lg">👤</span>
        </div>
      )}
      {label && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white/80 text-[0.4rem] sm:text-[0.5rem] text-center py-[2px] truncate px-1 font-medium">
          {isSelf ? 'You' : label}
        </div>
      )}
      {isSelf && hasVideo && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
    </div>
  );
}
