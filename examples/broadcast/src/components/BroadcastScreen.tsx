import { useEffect, useRef, useState } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Users,
  PhoneOff,
  Copy,
  Check,
} from 'lucide-react';
import { Chat } from './Chat';
import { ViewerList } from './ViewerList';
import type { ChatMessage, ViewerInfo } from '../types';

interface BroadcastScreenProps {
  broadcastId: string;
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  username: string;
  viewers: ViewerInfo[];
  viewerCount: number;
  messages: ChatMessage[];
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSendMessage: (text: string) => void;
  onEndBroadcast: () => void;
}

export function BroadcastScreen({
  broadcastId,
  localStream,
  isAudioEnabled,
  isVideoEnabled,
  username,
  viewers,
  viewerCount,
  messages,
  onToggleAudio,
  onToggleVideo,
  onSendMessage,
  onEndBroadcast,
}: BroadcastScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(broadcastId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="text-sm font-semibold text-white">LIVE</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            <span className="font-mono text-sm text-white">{broadcastId}</span>
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowViewers(!showViewers)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            <Users className="w-4 h-4 text-white" />
            <span className="text-sm text-white">{viewerCount}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-contain scale-x-[-1]"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">Camera is off</p>
                </div>
              </div>
            )}

            {/* Name Badge */}
            <div className="absolute bottom-4 left-4">
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg">
                <span className="text-sm text-white font-medium">{username} (You)</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-800">
            <button
              onClick={onToggleAudio}
              className={`p-4 rounded-full transition-colors ${
                isAudioEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button
              onClick={onToggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
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
              onClick={onEndBroadcast}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
              aria-label="End broadcast"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-gray-700">
            <Chat
              messages={messages}
              currentUserId="broadcaster"
              onSendMessage={onSendMessage}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}

        {/* Viewers Modal */}
        {showViewers && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowViewers(false)}>
            <div className="bg-gray-800 rounded-2xl p-6 w-80 max-h-96" onClick={(e) => e.stopPropagation()}>
              <ViewerList viewers={viewers} onClose={() => setShowViewers(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
