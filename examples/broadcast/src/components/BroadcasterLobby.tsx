import { useEffect, useRef, useState } from 'react';
import { Radio, Copy, Check, ArrowLeft, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { MediaDevice } from '../types';

interface BroadcasterLobbyProps {
  broadcastId: string | null;
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  username: string;
  cameras: MediaDevice[];
  microphones: MediaDevice[];
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  onUsernameChange: (name: string) => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSelectCamera: (deviceId: string) => void;
  onSelectMicrophone: (deviceId: string) => void;
  onGoLive: () => void;
  onBack: () => void;
}

export function BroadcasterLobby({
  broadcastId,
  localStream,
  isAudioEnabled,
  isVideoEnabled,
  username,
  cameras,
  microphones,
  selectedCameraId,
  selectedMicrophoneId,
  onUsernameChange,
  onToggleAudio,
  onToggleVideo,
  onSelectCamera,
  onSelectMicrophone,
  onGoLive,
  onBack,
}: BroadcasterLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const broadcastUrl = broadcastId
    ? `${window.location.origin}${window.location.pathname}?role=viewer&b=${broadcastId}`
    : '';

  const handleCopy = async () => {
    if (broadcastId) {
      await navigator.clipboard.writeText(broadcastUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">Setup Your Broadcast</h1>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto w-full">
        {/* Video Preview */}
        <div className="flex-1 flex flex-col">
          <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="w-16 h-16 text-gray-600" />
              </div>
            )}

            {/* Media Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                onClick={onToggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={onToggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="lg:w-80 space-y-6">
          {/* Broadcast Code */}
          {broadcastId && (
            <div className="bg-gray-800 rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-2">Broadcast Code</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-900 rounded-lg px-4 py-3 font-mono text-lg text-white">
                  {broadcastId}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  aria-label="Copy broadcast link"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Share this code with your viewers
              </p>
            </div>
          )}

          {/* Username */}
          <div className="bg-gray-800 rounded-xl p-4">
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Device Selectors */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Camera</label>
              <select
                value={selectedCameraId || ''}
                onChange={(e) => onSelectCamera(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Microphone</label>
              <select
                value={selectedMicrophoneId || ''}
                onChange={(e) => onSelectMicrophone(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Go Live Button */}
          <button
            onClick={onGoLive}
            disabled={!username.trim() || !broadcastId}
            className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <Radio className="w-5 h-5" />
            Go Live
          </button>
        </div>
      </div>
    </div>
  );
}
