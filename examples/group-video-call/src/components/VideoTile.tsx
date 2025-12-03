import { useEffect, useRef } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  peerId: string;
  isLocal?: boolean;
  isMuted?: boolean;
}

export function VideoTile({ stream, peerId, isLocal = false, isMuted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-tile ${isLocal ? 'local' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
      />
      <div className="video-label">
        {isLocal ? 'You' : `Peer ${peerId.slice(0, 6)}`}
        {isMuted && <span className="muted-indicator">Muted</span>}
      </div>
      {!stream && (
        <div className="video-placeholder">
          <span>Connecting...</span>
        </div>
      )}
    </div>
  );
}
