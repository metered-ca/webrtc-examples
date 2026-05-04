import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';

interface VideoTileProps {
  stream: MediaStream | null;
  peerId: string;
  isLocal?: boolean;
  isMuted?: boolean;
}

export function VideoTile({ stream, peerId, isLocal = false, isMuted = false }: VideoTileProps) {
  return (
    <View style={styles.tile}>
      {stream ? (
        <RTCView
          streamURL={stream.toURL()}
          style={styles.video}
          objectFit="cover"
          mirror={isLocal}
          zOrder={isLocal ? 1 : 0}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Connecting...</Text>
        </View>
      )}
      <View style={styles.label}>
        <Text style={styles.labelText}>
          {isLocal ? 'You' : `Peer ${peerId.slice(0, 6)}`}
        </Text>
        {isMuted && <Text style={styles.mutedText}> Muted</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '50%',
    aspectRatio: 3 / 4,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  placeholderText: {
    color: '#888',
    fontSize: 14,
  },
  label: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
  },
  mutedText: {
    color: '#ff6b6b',
    fontSize: 11,
  },
});
