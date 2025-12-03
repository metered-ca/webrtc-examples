import { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Copy, Check } from 'lucide-react';
import { VideoPreview } from './VideoPreview';
import { DeviceSelector } from './DeviceSelector';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useMediaStream } from '../hooks/useMediaStream';
import { getMeetingUrl } from '../utils/routing';

interface LobbyProps {
  meetingId: string;
  onJoin: (username: string, stream: MediaStream, isAudioEnabled: boolean, isVideoEnabled: boolean) => void;
}

export function Lobby({ meetingId, onJoin }: LobbyProps) {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('video-call-username') || '';
  });
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    cameras,
    microphones,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCameraId,
    setSelectedMicrophoneId,
    refreshDevices,
  } = useMediaDevices();

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    error: mediaError,
    startMedia,
    toggleAudio,
    toggleVideo,
  } = useMediaStream({
    selectedCameraId,
    selectedMicrophoneId,
  });

  // Start media on mount
  useEffect(() => {
    startMedia().then(() => {
      refreshDevices();
    }).catch(console.error);
  }, []);

  // Restart media when device selection changes
  useEffect(() => {
    if (selectedCameraId || selectedMicrophoneId) {
      startMedia({ video: isVideoEnabled, audio: isAudioEnabled }).catch(console.error);
    }
  }, [selectedCameraId, selectedMicrophoneId]);

  // Save username to localStorage
  useEffect(() => {
    if (username) {
      localStorage.setItem('video-call-username', username);
    }
  }, [username]);

  const handleJoin = async () => {
    if (!username.trim() || !localStream) return;

    setIsJoining(true);
    try {
      onJoin(username.trim(), localStream, isAudioEnabled, isVideoEnabled);
    } catch (err) {
      console.error('Error joining:', err);
      setIsJoining(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getMeetingUrl(meetingId);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 gap-8">
      {/* Video Preview Section */}
      <div className="w-full max-w-lg lg:max-w-xl">
        <VideoPreview
          stream={localStream}
          isVideoEnabled={isVideoEnabled}
          username={username || undefined}
        />

        {/* Media Controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>
        </div>

        {mediaError && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
            {mediaError}
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Ready to join?</h1>
          <p className="text-gray-400 text-sm">
            Meeting: <span className="font-mono">{meetingId}</span>
          </p>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2.5 px-4 rounded-lg transition-colors text-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              Link copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy meeting link
            </>
          )}
        </button>

        {/* Username Input */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Your name
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Device Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Camera
            </label>
            <DeviceSelector
              devices={cameras}
              selectedDeviceId={selectedCameraId}
              onSelect={setSelectedCameraId}
              type="camera"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Microphone
            </label>
            <DeviceSelector
              devices={microphones}
              selectedDeviceId={selectedMicrophoneId}
              onSelect={setSelectedMicrophoneId}
              type="microphone"
            />
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={!username.trim() || !localStream || isJoining}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {isJoining ? 'Joining...' : 'Join Meeting'}
        </button>
      </div>
    </div>
  );
}
