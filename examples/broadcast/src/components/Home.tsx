import { useState } from 'react';
import { Radio, Users, ArrowRight } from 'lucide-react';

interface HomeProps {
  onStartBroadcast: () => void;
  onJoinBroadcast: (broadcastId: string) => void;
}

export function Home({ onStartBroadcast, onJoinBroadcast }: HomeProps) {
  const [joinBroadcastId, setJoinBroadcastId] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinBroadcastId.trim()) {
      onJoinBroadcast(joinBroadcastId.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Live Broadcast</h1>
          <p className="text-gray-400">
            Start a live broadcast or join as a viewer
          </p>
        </div>

        {/* Start Broadcast Button */}
        <button
          onClick={onStartBroadcast}
          className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors mb-6"
        >
          <Radio className="w-5 h-5" />
          Start Broadcasting
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-sm">or watch a broadcast</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Join Broadcast Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={joinBroadcastId}
            onChange={(e) => setJoinBroadcastId(e.target.value.toUpperCase())}
            placeholder="Enter broadcast code (e.g., ABC123)"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent uppercase"
            maxLength={6}
          />
          <button
            type="submit"
            disabled={!joinBroadcastId.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors border border-gray-700"
          >
            <Users className="w-4 h-4" />
            Watch Broadcast
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="text-2xl mb-2">📺</div>
            <div className="text-sm text-gray-400">HD Video</div>
          </div>
          <div className="p-4">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm text-gray-400">Many Viewers</div>
          </div>
          <div className="p-4">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm text-gray-400">Live Chat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
