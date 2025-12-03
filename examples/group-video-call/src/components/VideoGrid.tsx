import { VideoTile } from './VideoTile';
import { RemotePeer } from '../types';

interface VideoGridProps {
  localStream: MediaStream | null;
  localPeerId: string;
  remotePeers: RemotePeer[];
  isAudioMuted: boolean;
}

export function VideoGrid({ localStream, localPeerId, remotePeers, isAudioMuted }: VideoGridProps) {
  const totalParticipants = 1 + remotePeers.length;

  return (
    <div className={`video-grid participants-${Math.min(totalParticipants, 4)}`}>
      <VideoTile
        stream={localStream}
        peerId={localPeerId}
        isLocal={true}
        isMuted={isAudioMuted}
      />
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.peerId}
          stream={peer.stream}
          peerId={peer.peerId}
        />
      ))}
    </div>
  );
}
