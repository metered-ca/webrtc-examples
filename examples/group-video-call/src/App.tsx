import { useState, useCallback, useRef, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { VideoGrid } from './components/VideoGrid';
import { Controls } from './components/Controls';
import { useMediaStream } from './hooks/useMediaStream';
import { useSignaling } from './hooks/useSignaling';
import { useWebRTC } from './hooks/useWebRTC';
import { SignalingMessage } from './types';
import './App.css';

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
    toggleVideo
  } = useMediaStream();

  // Use a ref to always have access to the latest webrtc functions
  const webrtcRef = useRef<ReturnType<typeof useWebRTC> | null>(null);

  const handleSignalingMessage = useCallback((message: SignalingMessage) => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    switch (message.type) {
      case 'room-peers':
        // Connect to all existing peers in the room
        message.peers?.forEach(remotePeerId => {
          webrtc.createPeerConnection(remotePeerId, true);
        });
        break;

      case 'peer-joined':
        // A new peer joined - they will initiate the connection
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
    onDisconnected: () => console.log('Disconnected from signaling server')
  });

  const webrtc = useWebRTC({
    localStream,
    peerId,
    sendSignaling: signaling.send
  });

  // Keep the ref updated with the latest webrtc instance
  useEffect(() => {
    webrtcRef.current = webrtc;
  }, [webrtc]);

  const handleJoin = useCallback(async (roomName: string) => {
    setIsLoading(true);
    setJoinError(null);

    try {
      // Start media first
      await startMedia();

      // Initialize ICE servers (fetch TURN credentials)
      await webrtc.initializeIceServers();

      // Connect to signaling server
      signaling.connect();

      // Small delay to ensure WebSocket is connected
      await new Promise(resolve => setTimeout(resolve, 500));

      // Join the room
      signaling.send({
        type: 'join',
        roomId: roomName,
        peerId
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
      <JoinScreen
        onJoin={handleJoin}
        isLoading={isLoading}
        error={joinError || mediaError}
      />
    );
  }

  return (
    <div className="call-screen">
      <div className="header">
        <h2>Room: {roomId}</h2>
        <span className="participant-count">
          {1 + webrtc.remotePeers.length} participant(s)
        </span>
      </div>

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
        onLeave={handleLeave}
      />
    </div>
  );
}
