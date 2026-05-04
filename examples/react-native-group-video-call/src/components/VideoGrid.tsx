import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MediaStream } from 'react-native-webrtc';
import { VideoTile } from './VideoTile';
import { RemotePeer } from '../types';

interface VideoGridProps {
  localStream: MediaStream | null;
  localPeerId: string;
  remotePeers: RemotePeer[];
  isAudioMuted: boolean;
}

export function VideoGrid({ localStream, localPeerId, remotePeers, isAudioMuted }: VideoGridProps) {
  return (
    <View style={styles.grid}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0f0f23',
  },
});
