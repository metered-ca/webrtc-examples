import { useEffect, useRef } from 'react';
import { MicOff, Monitor } from 'lucide-react';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isScreenShare?: boolean;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isScreenShare = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0;

  return (
    <div
      className={`video-tile relative bg-gray-800 rounded-xl overflow-hidden h-full w-full ${
        isLocal ? 'local' : ''
      } ${isScreenShare ? 'screen-share' : ''}`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`absolute inset-0 w-full h-full object-contain bg-gray-900 ${
            isLocal && !isScreenShare ? 'scale-x-[-1]' : ''
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-xl md:text-2xl font-semibold text-white">
              {username[0]?.toUpperCase() || '?'}
            </span>
          </div>
        </div>
      )}

      {/* Screen share indicator */}
      {isScreenShare && (
        <div className="absolute top-2 left-2 z-10 bg-blue-600 px-2 py-1 rounded-md flex items-center gap-1 shadow-lg">
          <Monitor className="w-3 h-3 text-white" />
          <span className="text-xs text-white font-medium">Screen</span>
        </div>
      )}

      {/* Username and indicators */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-6 pb-2 px-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium truncate drop-shadow-lg">
              {isLocal ? `${username} (You)` : username}
            </span>
            <div className="flex items-center gap-2">
              {isMuted && !isScreenShare && (
                <div className="muted-indicator bg-red-600 p-1 rounded-full shadow-lg">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connecting overlay */}
      {!stream && (
        <div className="video-placeholder absolute inset-0 flex items-center justify-center bg-gray-800/80">
          <div className="text-center">
            <div className="animate-pulse w-8 h-8 bg-gray-600 rounded-full mx-auto mb-2" />
            <span className="text-sm text-gray-400">Connecting...</span>
          </div>
        </div>
      )}
    </div>
  );
}
