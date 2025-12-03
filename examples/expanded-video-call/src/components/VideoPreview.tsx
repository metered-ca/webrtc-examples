import { useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  username?: string;
}

export function VideoPreview({ stream, isVideoEnabled, username }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden">
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
            {isVideoEnabled ? (
              <span className="text-3xl font-semibold text-white">
                {username ? username[0].toUpperCase() : '?'}
              </span>
            ) : (
              <VideoOff className="w-8 h-8 text-gray-500" />
            )}
          </div>
          {!isVideoEnabled && (
            <span className="text-sm text-gray-500">Camera off</span>
          )}
        </div>
      )}

      {/* Username overlay */}
      {username && (
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-sm text-white">{username}</span>
        </div>
      )}
    </div>
  );
}
