import { useState, useCallback, useEffect, useRef } from 'react';
import { VideoGrid } from './VideoGrid';
import { Controls } from './Controls';
import { Chat } from './Chat';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import { useScreenShare } from '../hooks/useScreenShare';
import { useChat } from '../hooks/useChat';
import type { SignalingMessage, ChatMessage } from '../types';

interface CallScreenProps {
  meetingId: string;
  username: string;
  peerId: string;
  localStream: MediaStream;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

export function CallScreen({
  meetingId,
  username,
  peerId,
  localStream,
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave,
}: CallScreenProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const webrtcRef = useRef<ReturnType<typeof useWebRTC> | null>(null);

  const { messages, unreadCount, addMessage, markAsRead } = useChat();

  const handleChatMessage = useCallback((message: ChatMessage) => {
    addMessage(message);
  }, [addMessage]);

  const handleSignalingMessage = useCallback((message: SignalingMessage) => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    switch (message.type) {
      case 'room-peers':
        message.peers?.forEach((peer) => {
          webrtc.createPeerConnection(peer.peerId, peer.username, true);
        });
        break;

      case 'peer-joined':
        if (message.peerId && message.username) {
          console.log(`Peer ${message.username} joined the room`);
        }
        break;

      case 'peer-left':
        if (message.peerId) {
          webrtc.removePeer(message.peerId);
        }
        break;

      case 'offer':
        if (message.from && message.sdp) {
          const peerUsername = message.username || 'Unknown';
          webrtc.handleOffer(message.from, peerUsername, message.sdp);
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

      case 'username-update':
        if (message.peerId && message.username) {
          webrtc.updatePeerUsername(message.peerId, message.username);
        }
        break;

      case 'screen-share-started':
        // Screen share track will arrive via WebRTC ontrack event
        break;

      case 'screen-share-stopped':
        if (message.peerId) {
          webrtc.clearPeerScreenStream(message.peerId);
        }
        break;
    }
  }, []);

  const signaling = useSignaling({
    onMessage: handleSignalingMessage,
    onConnected: () => console.log('Connected to signaling server'),
    onDisconnected: () => console.log('Disconnected from signaling server'),
  });

  const {
    screenStream,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
  } = useScreenShare();

  const webrtc = useWebRTC({
    localStream,
    screenStream,
    peerId,
    username,
    sendSignaling: signaling.send,
    onChatMessage: handleChatMessage,
  });

  // Keep ref updated
  useEffect(() => {
    webrtcRef.current = webrtc;
  }, [webrtc]);

  // Connect and join room on mount
  useEffect(() => {
    signaling.connect();

    // Small delay to ensure WebSocket is connected
    const timer = setTimeout(() => {
      signaling.send({
        type: 'join',
        roomId: meetingId,
        peerId,
        username,
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      webrtc.closeAllConnections();
      signaling.disconnect();
    };
  }, [meetingId, peerId, username]);

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      webrtc.removeScreenShareTrack();
      signaling.send({ type: 'screen-share-stopped' });
    } else {
      try {
        const stream = await startScreenShare();
        webrtc.addScreenShareTrack(stream);
        signaling.send({ type: 'screen-share-started' });
      } catch (err) {
        // User cancelled or error
        console.log('Screen share cancelled or failed');
      }
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => !prev);
    if (!isChatOpen) {
      markAsRead();
    }
  };

  const handleSendMessage = (text: string) => {
    webrtc.sendChatMessage(text);
  };

  const participantCount = 1 + webrtc.remotePeers.length;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white hidden sm:block">
            {meetingId}
          </h1>
          <span className="participant-count text-sm text-gray-400">
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className={`flex-1 flex flex-col ${isChatOpen ? 'hidden lg:flex' : 'flex'}`}>
          <VideoGrid
            localStream={localStream}
            localScreenStream={screenStream}
            localUsername={username}
            remotePeers={webrtc.remotePeers}
            isAudioMuted={!isAudioEnabled}
            isLocalScreenSharing={isScreenSharing}
          />
        </div>

        {/* Chat panel */}
        {isChatOpen && (
          <div className="w-full lg:w-80 flex-shrink-0">
            <Chat
              messages={messages}
              currentUserId={peerId}
              onSendMessage={handleSendMessage}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        unreadMessages={unreadCount}
        meetingId={meetingId}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={handleToggleChat}
        onLeave={onLeave}
      />
    </div>
  );
}
