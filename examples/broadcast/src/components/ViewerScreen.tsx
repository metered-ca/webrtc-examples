import { useEffect, useRef, useState } from 'react';
import { Radio, MessageSquare, LogOut, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { Chat } from './Chat';
import type { ChatMessage } from '../types';

interface ViewerScreenProps {
  broadcastId: string;
  broadcasterUsername: string;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | null;
  username: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onLeave: () => void;
}

export function ViewerScreen({
  broadcastId,
  broadcasterUsername,
  remoteStream,
  connectionState,
  username,
  messages,
  onSendMessage,
  onLeave,
}: ViewerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="text-sm font-semibold text-white">LIVE</span>
          </div>
          <div className="text-white">
            <span className="font-mono text-sm text-gray-400">{broadcastId}</span>
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-sm">{broadcasterUsername}</span>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          Watching as <span className="text-white font-medium">{username}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="flex-1 relative bg-black broadcast-video">
            {remoteStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {isConnecting ? (
                    <>
                      <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Connecting to broadcast...</p>
                    </>
                  ) : (
                    <>
                      <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Waiting for video stream...</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Broadcaster Name Badge */}
            {remoteStream && (
              <div className="absolute bottom-4 left-4">
                <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg">
                  <span className="text-sm text-white font-medium">{broadcasterUsername}</span>
                </div>
              </div>
            )}

            {/* Connection State Badge */}
            {connectionState && !isConnected && (
              <div className="absolute top-4 left-4">
                <div className={`px-3 py-1.5 rounded-lg ${
                  isConnecting ? 'bg-yellow-600/80' : 'bg-red-600/80'
                }`}>
                  <span className="text-sm text-white font-medium capitalize">
                    {connectionState}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-800">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-4 rounded-full transition-colors ${
                showChat
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              aria-label="Toggle chat"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
            <button
              onClick={onLeave}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
              aria-label="Leave broadcast"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-gray-700">
            <Chat
              messages={messages}
              currentUserId={username}
              onSendMessage={onSendMessage}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
