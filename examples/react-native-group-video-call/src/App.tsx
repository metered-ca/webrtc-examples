import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { JoinScreen } from './components/JoinScreen';
import { VideoGrid } from './components/VideoGrid';
import { Controls } from './components/Controls';
import { useMediaStream } from './hooks/useMediaStream';
import { useSignaling } from './hooks/useSignaling';
import { useWebRTC } from './hooks/useWebRTC';
import { SignalingMessage } from './types';

function generatePeerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const peerIdRef = useRef(generatePeerId());
  const peerId = peerIdRef.current;

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    error: mediaError,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    switchCamera,
  } = useMediaStream();

  const webrtcRef = useRef<ReturnType<typeof useWebRTC> | null>(null);

  const handleSignalingMessage = useCallback((message: SignalingMessage) => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    switch (message.type) {
      case 'room-peers':
        message.peers?.forEach(remotePeerId => {
          webrtc.createPeerConnection(remotePeerId, true);
        });
        break;

      case 'peer-joined':
        console.log(`Peer ${message.peerId} joined the room`);
        break;

      case 'peer-left':
        if (message.peerId) {
          webrtc.removePeer(message.peerId);
        }
        break;

      case 'offer':
        if (message.from && message.sdp) {
          webrtc.handleOffer(message.from, message.sdp);
        }
        break;

      case 'answer':
        if (message.from && message.sdp) {
          webrtc.handleAnswer(message.from, message.sdp);
        }
        break;

      case 'ice-candidate':
        if (message.from && message.candidate) {
          webrtc.handleIceCandidate(message.from, message.candidate);
        }
        break;
    }
  }, []);

  const signaling = useSignaling({
    onMessage: handleSignalingMessage,
    onConnected: () => console.log('Connected to signaling server'),
    onDisconnected: () => console.log('Disconnected from signaling server'),
  });

  const webrtc = useWebRTC({
    localStream,
    peerId,
    sendSignaling: signaling.send,
  });

  useEffect(() => {
    webrtcRef.current = webrtc;
  }, [webrtc]);

  const handleJoin = useCallback(async (roomName: string) => {
    setIsLoading(true);
    setJoinError(null);

    try {
      await startMedia();
      await webrtc.initializeIceServers();

      signaling.connect();

      await new Promise(resolve => setTimeout(resolve, 500));

      signaling.send({
        type: 'join',
        roomId: roomName,
        peerId,
      });

      setRoomId(roomName);
      setIsJoined(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      setJoinError(message);
    } finally {
      setIsLoading(false);
    }
  }, [startMedia, webrtc, signaling, peerId]);

  const handleLeave = useCallback(() => {
    webrtc.closeAllConnections();
    signaling.disconnect();
    stopMedia();
    setIsJoined(false);
    setRoomId(null);
  }, [webrtc, signaling, stopMedia]);

  if (!isJoined) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f23" />
        <JoinScreen
          onJoin={handleJoin}
          isLoading={isLoading}
          error={joinError || mediaError}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <Text style={styles.roomName}>Room: {roomId}</Text>
        <Text style={styles.participantCount}>
          {1 + webrtc.remotePeers.length} participant(s)
        </Text>
      </View>

      <VideoGrid
        localStream={localStream}
        localPeerId={peerId}
        remotePeers={webrtc.remotePeers}
        isAudioMuted={!isAudioEnabled}
      />

      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
        onLeave={handleLeave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  roomName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  participantCount: {
    color: '#888',
    fontSize: 14,
  },
});
