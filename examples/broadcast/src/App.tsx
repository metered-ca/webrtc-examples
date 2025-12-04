import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  BroadcasterLobby,
  ViewerLobby,
  BroadcastScreen,
  ViewerScreen,
} from './components';
import {
  useSignaling,
  useMediaStream,
  useMediaDevices,
  useBroadcasterWebRTC,
  useViewerWebRTC,
} from './hooks';
import {
  getBroadcastIdFromUrl,
  getRoleFromUrl,
  navigateToBroadcaster,
  navigateToViewer,
  navigateHome,
} from './utils/routing';
import type { AppView, ChatMessage, SignalingMessage } from './types';

function generatePeerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function App() {
  // View state
  const [view, setView] = useState<AppView>('home');
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [peerId] = useState(() => generatePeerId());
  const [username, setUsername] = useState('');

  // Broadcast state
  const [isLive, setIsLive] = useState(false);
  const [broadcasterUsername, setBroadcasterUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs for callback stability
  const viewRef = useRef(view);
  const broadcastIdRef = useRef(broadcastId);
  const usernameRef = useRef(username);

  useEffect(() => {
    viewRef.current = view;
    broadcastIdRef.current = broadcastId;
    usernameRef.current = username;
  }, [view, broadcastId, username]);

  // Media hooks
  const devices = useMediaDevices();
  const media = useMediaStream({
    selectedCameraId: devices.selectedCameraId,
    selectedMicrophoneId: devices.selectedMicrophoneId,
  });

  // Handle signaling messages
  const handleSignalingMessage = useCallback((message: SignalingMessage) => {
    switch (message.type) {
      case 'broadcast-created':
        setBroadcastId(message.broadcastId);
        break;

      case 'broadcast-info':
        setBroadcasterUsername(message.broadcasterUsername);
        setIsLive(message.isLive);
        setIsConnecting(false);
        break;

      case 'broadcast-started':
        setIsLive(true);
        break;

      case 'broadcast-ended':
        setIsLive(false);
        if (viewRef.current === 'viewing') {
          // Viewer was watching, go back to viewer lobby
          setView('viewer-lobby');
        }
        break;

      case 'viewer-joined':
        // Broadcaster: create peer connection for new viewer
        if (viewRef.current === 'broadcasting') {
          broadcasterWebRTC.createConnectionForViewer(message.peerId, message.username);
        }
        break;

      case 'viewer-left':
        // Broadcaster: remove viewer connection
        broadcasterWebRTC.removeViewer(message.peerId);
        break;

      case 'viewer-count':
        // Handled by useBroadcasterWebRTC internally
        break;

      case 'offer':
        // Viewer: receive offer from broadcaster
        // Handle in both viewer-lobby and viewing states
        if ((viewRef.current === 'viewing' || viewRef.current === 'viewer-lobby') && message.sdp) {
          // Auto-transition to viewing if in lobby
          if (viewRef.current === 'viewer-lobby') {
            setView('viewing');
          }
          viewerWebRTC.handleOffer(message.sdp);
        }
        break;

      case 'answer':
        // Broadcaster: receive answer from viewer
        if (viewRef.current === 'broadcasting' && message.from && message.sdp) {
          broadcasterWebRTC.handleAnswer(message.from, message.sdp);
        }
        break;

      case 'ice-candidate':
        // Both: handle ICE candidates
        if (message.candidate) {
          if (viewRef.current === 'broadcasting' && message.from) {
            broadcasterWebRTC.handleIceCandidate(message.from, message.candidate);
          } else if (viewRef.current === 'viewing') {
            viewerWebRTC.handleIceCandidate(message.candidate);
          }
        }
        break;

      case 'chat':
        // Both: receive chat message
        setMessages((prev) => [
          ...prev,
          {
            id: message.id,
            from: message.from,
            username: message.username,
            text: message.text,
            timestamp: message.timestamp,
          },
        ]);
        break;

      case 'error':
        console.error('Server error:', message.message);
        break;
    }
  }, []);

  // Signaling hook
  const signaling = useSignaling({
    onMessage: handleSignalingMessage,
    onConnected: () => {
      console.log('Connected to signaling server');
    },
    onDisconnected: () => {
      console.log('Disconnected from signaling server');
    },
  });

  // WebRTC hooks
  const broadcasterWebRTC = useBroadcasterWebRTC({
    localStream: media.localStream,
    peerId,
    sendSignaling: signaling.send,
  });

  const viewerWebRTC = useViewerWebRTC({
    peerId,
    sendSignaling: signaling.send,
  });

  // URL routing
  useEffect(() => {
    const handleRouteChange = () => {
      const role = getRoleFromUrl();
      const urlBroadcastId = getBroadcastIdFromUrl();

      if (role === 'broadcaster' && urlBroadcastId) {
        setBroadcastId(urlBroadcastId);
        setView('broadcaster-lobby');
      } else if (role === 'viewer' && urlBroadcastId) {
        setBroadcastId(urlBroadcastId);
        setView('viewer-lobby');
      } else {
        setView('home');
        setBroadcastId(null);
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Start broadcast flow
  const handleStartBroadcast = async () => {
    try {
      // Get media first
      await media.startMedia();
      await devices.refreshDevices();

      // Connect to signaling server
      signaling.connect();

      // Wait for connection and create broadcast
      setTimeout(() => {
        signaling.send({
          type: 'create-broadcast',
          peerId,
          username: username || 'Broadcaster',
        });
      }, 100);

      setView('broadcaster-lobby');
    } catch (err) {
      console.error('Failed to start media:', err);
    }
  };

  // Join broadcast as viewer
  const handleJoinBroadcast = (id: string) => {
    setBroadcastId(id);
    setIsConnecting(true);

    // Connect to signaling server
    signaling.connect();

    // Wait for connection and join broadcast
    setTimeout(() => {
      signaling.send({
        type: 'join-broadcast',
        broadcastId: id,
        peerId,
        username: username || 'Viewer',
      });
    }, 100);

    navigateToViewer(id);
    setView('viewer-lobby');
  };

  // Go live (broadcaster)
  const handleGoLive = () => {
    if (!broadcastId) return;

    signaling.send({
      type: 'start-broadcast',
      broadcastId,
    });

    setIsLive(true);
    navigateToBroadcaster(broadcastId);
    setView('broadcasting');
  };

  // Join as viewer (after lobby)
  const handleJoinAsViewer = () => {
    setView('viewing');
  };

  // End broadcast
  const handleEndBroadcast = () => {
    if (broadcastId) {
      signaling.send({
        type: 'end-broadcast',
        broadcastId,
      });
    }

    broadcasterWebRTC.closeAllConnections();
    media.stopMedia();
    signaling.disconnect();

    setIsLive(false);
    setBroadcastId(null);
    setMessages([]);
    navigateHome();
    setView('home');
  };

  // Leave broadcast (viewer)
  const handleLeaveBroadcast = () => {
    if (broadcastId) {
      signaling.send({
        type: 'leave-broadcast',
        broadcastId,
        peerId,
      });
    }

    viewerWebRTC.closeConnection();
    signaling.disconnect();

    setBroadcastId(null);
    setMessages([]);
    setBroadcasterUsername(null);
    setIsLive(false);
    navigateHome();
    setView('home');
  };

  // Send chat message
  const handleSendMessage = (text: string) => {
    if (broadcastId) {
      signaling.send({
        type: 'chat-message',
        broadcastId,
        text,
      });
    }
  };

  // Go back to home
  const handleBack = () => {
    media.stopMedia();
    signaling.disconnect();
    broadcasterWebRTC.closeAllConnections();
    viewerWebRTC.closeConnection();

    setBroadcastId(null);
    setMessages([]);
    setBroadcasterUsername(null);
    setIsLive(false);
    navigateHome();
    setView('home');
  };

  // Render based on view
  switch (view) {
    case 'home':
      return (
        <Home
          onStartBroadcast={handleStartBroadcast}
          onJoinBroadcast={handleJoinBroadcast}
        />
      );

    case 'broadcaster-lobby':
      return (
        <BroadcasterLobby
          broadcastId={broadcastId}
          localStream={media.localStream}
          isAudioEnabled={media.isAudioEnabled}
          isVideoEnabled={media.isVideoEnabled}
          username={username}
          cameras={devices.cameras}
          microphones={devices.microphones}
          selectedCameraId={devices.selectedCameraId}
          selectedMicrophoneId={devices.selectedMicrophoneId}
          onUsernameChange={setUsername}
          onToggleAudio={media.toggleAudio}
          onToggleVideo={media.toggleVideo}
          onSelectCamera={devices.setSelectedCameraId}
          onSelectMicrophone={devices.setSelectedMicrophoneId}
          onGoLive={handleGoLive}
          onBack={handleBack}
        />
      );

    case 'viewer-lobby':
      return (
        <ViewerLobby
          broadcastId={broadcastId || ''}
          broadcasterUsername={broadcasterUsername}
          isLive={isLive}
          isConnecting={isConnecting}
          username={username}
          onUsernameChange={setUsername}
          onJoin={handleJoinAsViewer}
          onBack={handleBack}
        />
      );

    case 'broadcasting':
      return (
        <BroadcastScreen
          broadcastId={broadcastId || ''}
          localStream={media.localStream}
          isAudioEnabled={media.isAudioEnabled}
          isVideoEnabled={media.isVideoEnabled}
          username={username}
          viewers={broadcasterWebRTC.viewers}
          viewerCount={broadcasterWebRTC.viewerCount}
          messages={messages}
          onToggleAudio={media.toggleAudio}
          onToggleVideo={media.toggleVideo}
          onSendMessage={handleSendMessage}
          onEndBroadcast={handleEndBroadcast}
        />
      );

    case 'viewing':
      return (
        <ViewerScreen
          broadcastId={broadcastId || ''}
          broadcasterUsername={broadcasterUsername || 'Broadcaster'}
          remoteStream={viewerWebRTC.remoteStream}
          connectionState={viewerWebRTC.connectionState}
          username={username}
          messages={messages}
          onSendMessage={handleSendMessage}
          onLeave={handleLeaveBroadcast}
        />
      );

    default:
      return null;
  }
}
