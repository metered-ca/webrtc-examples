import { useState } from 'react';
import { Video, Users, ArrowRight } from 'lucide-react';
import { generateMeetingId, navigateToMeeting } from '../utils/routing';

export function Home() {
  const [joinMeetingId, setJoinMeetingId] = useState('');

  const handleCreateMeeting = () => {
    const meetingId = generateMeetingId();
    navigateToMeeting(meetingId);
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinMeetingId.trim()) {
      navigateToMeeting(joinMeetingId.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Video Call</h1>
          <p className="text-gray-400">
            Start or join a video meeting with screen sharing and chat
          </p>
        </div>

        {/* Create Meeting Button */}
        <button
          onClick={handleCreateMeeting}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors mb-6"
        >
          <Users className="w-5 h-5" />
          Create New Meeting
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-sm">or join existing</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Join Meeting Form */}
        <form onSubmit={handleJoinMeeting} className="space-y-4">
          <input
            type="text"
            value={joinMeetingId}
            onChange={(e) => setJoinMeetingId(e.target.value)}
            placeholder="Enter meeting code (e.g., xxxx-xxxx-xxxx)"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!joinMeetingId.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors border border-gray-700"
          >
            Join Meeting
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="text-2xl mb-2">🎥</div>
            <div className="text-sm text-gray-400">HD Video</div>
          </div>
          <div className="p-4">
            <div className="text-2xl mb-2">🖥️</div>
            <div className="text-sm text-gray-400">Screen Share</div>
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
