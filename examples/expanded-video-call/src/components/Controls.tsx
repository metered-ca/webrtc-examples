import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  PhoneOff,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { getMeetingUrl } from '../utils/routing';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  unreadMessages: number;
  meetingId: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
}

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
}

function ControlButton({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
  badge,
}: ControlButtonProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={onClick}
            className={`relative p-3 md:p-4 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : active
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            aria-label={label}
          >
            {icon}
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg"
            sideOffset={8}
          >
            {label}
            <Tooltip.Arrow className="fill-gray-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function Controls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isChatOpen,
  unreadMessages,
  meetingId,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
}: ControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = getMeetingUrl(meetingId);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 md:py-4">
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {/* Audio toggle */}
        <ControlButton
          icon={isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          label={isAudioEnabled ? 'Mute' : 'Unmute'}
          onClick={onToggleAudio}
          active={isAudioEnabled}
        />

        {/* Video toggle */}
        <ControlButton
          icon={isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          label={isVideoEnabled ? 'Stop video' : 'Start video'}
          onClick={onToggleVideo}
          active={isVideoEnabled}
        />

        {/* Screen share toggle */}
        <ControlButton
          icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          onClick={onToggleScreenShare}
          active={!isScreenSharing}
        />

        {/* Chat toggle */}
        <ControlButton
          icon={<MessageSquare className="w-5 h-5" />}
          label={isChatOpen ? 'Close chat' : 'Open chat'}
          onClick={onToggleChat}
          active={true}
          badge={isChatOpen ? 0 : unreadMessages}
        />

        {/* Copy link */}
        <ControlButton
          icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          label={copied ? 'Copied!' : 'Copy invite link'}
          onClick={handleCopyLink}
          active={true}
        />

        {/* Leave button */}
        <ControlButton
          icon={<PhoneOff className="w-5 h-5" />}
          label="Leave meeting"
          onClick={onLeave}
          danger
        />
      </div>
    </div>
  );
}
