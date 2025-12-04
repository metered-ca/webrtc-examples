import { useState } from 'react';
import { Radio, ArrowLeft, Loader2 } from 'lucide-react';

interface ViewerLobbyProps {
  broadcastId: string;
  broadcasterUsername: string | null;
  isLive: boolean;
  isConnecting: boolean;
  username: string;
  onUsernameChange: (name: string) => void;
  onJoin: () => void;
  onBack: () => void;
}

export function ViewerLobby({
  broadcastId,
  broadcasterUsername,
  isLive,
  isConnecting,
  username,
  onUsernameChange,
  onJoin,
  onBack,
}: ViewerLobbyProps) {
  const [localUsername, setLocalUsername] = useState(username);

  const handleJoin = () => {
    onUsernameChange(localUsername);
    onJoin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Broadcast Info Card */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-2xl mb-4">
              <Radio className={`w-8 h-8 ${isLive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="font-mono text-xl text-white">{broadcastId}</span>
              {isLive && (
                <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full">
                  LIVE
                </span>
              )}
            </div>

            {broadcasterUsername ? (
              <p className="text-gray-400">
                Hosted by <span className="text-white font-medium">{broadcasterUsername}</span>
              </p>
            ) : (
              <p className="text-gray-500">
                {isConnecting ? 'Connecting...' : 'Waiting for broadcast info...'}
              </p>
            )}
          </div>

          {!isLive && !isConnecting && (
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                Waiting for broadcast to start...
              </p>
            </div>
          )}
        </div>

        {/* Join Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            <input
              type="text"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={!localUsername.trim() || !isLive || isConnecting}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : isLive ? (
              <>
                <Radio className="w-5 h-5" />
                Watch Broadcast
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for broadcast...
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
