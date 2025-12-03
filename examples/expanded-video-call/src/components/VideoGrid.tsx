import { VideoTile } from './VideoTile';
import type { RemotePeer } from '../types';

interface VideoGridProps {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  localUsername: string;
  remotePeers: RemotePeer[];
  isAudioMuted: boolean;
  isLocalScreenSharing: boolean;
}

export function VideoGrid({
  localStream,
  localScreenStream,
  localUsername,
  remotePeers,
  isAudioMuted,
  isLocalScreenSharing,
}: VideoGridProps) {
  // Calculate total tiles including screen shares
  const screenShareCount = remotePeers.filter((p) => p.screenStream).length + (isLocalScreenSharing ? 1 : 0);
  const cameraCount = 1 + remotePeers.length; // local + remotes
  const totalTiles = cameraCount + screenShareCount;

  // Determine grid layout based on participant count
  const getGridClasses = () => {
    if (totalTiles === 1) return 'grid-cols-1';
    if (totalTiles === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalTiles <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (totalTiles <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  // If there are screen shares, use a different layout
  const hasScreenShare = screenShareCount > 0;

  if (hasScreenShare) {
    return (
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        {/* Screen shares - take up most space */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {isLocalScreenSharing && localScreenStream && (
            <div className="flex-1 min-h-0">
              <VideoTile
                stream={localScreenStream}
                username={localUsername}
                isLocal
                isScreenShare
              />
            </div>
          )}
          {remotePeers
            .filter((p) => p.screenStream)
            .map((peer) => (
              <div key={`screen-${peer.peerId}`} className="flex-1 min-h-0">
                <VideoTile
                  stream={peer.screenStream}
                  username={peer.username}
                  isScreenShare
                />
              </div>
            ))}
        </div>

        {/* Camera views - sidebar on desktop, bottom on mobile */}
        <div className="lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0">
          {/* Local video */}
          <div className="w-40 lg:w-full flex-shrink-0 aspect-video">
            <VideoTile
              stream={localStream}
              username={localUsername}
              isLocal
              isMuted={isAudioMuted}
            />
          </div>

          {/* Remote videos */}
          {remotePeers.map((peer) => (
            <div key={peer.peerId} className="w-40 lg:w-full flex-shrink-0 aspect-video">
              <VideoTile
                stream={peer.stream}
                username={peer.username}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard grid layout when no screen shares
  return (
    <div className={`flex-1 grid ${getGridClasses()} gap-3 p-3 auto-rows-fr overflow-hidden`}>
      {/* Local video */}
      <div className="min-h-0">
        <VideoTile
          stream={localStream}
          username={localUsername}
          isLocal
          isMuted={isAudioMuted}
        />
      </div>

      {/* Remote videos */}
      {remotePeers.map((peer) => (
        <div key={peer.peerId} className="min-h-0">
          <VideoTile
            stream={peer.stream}
            username={peer.username}
          />
        </div>
      ))}
    </div>
  );
}
