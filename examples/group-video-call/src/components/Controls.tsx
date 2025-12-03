interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

export function Controls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave
}: ControlsProps) {
  return (
    <div className="controls">
      <button
        className={`control-btn ${!isAudioEnabled ? 'off' : ''}`}
        onClick={onToggleAudio}
        title={isAudioEnabled ? 'Mute audio' : 'Unmute audio'}
      >
        {isAudioEnabled ? 'Mute' : 'Unmute'}
      </button>

      <button
        className={`control-btn ${!isVideoEnabled ? 'off' : ''}`}
        onClick={onToggleVideo}
        title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
      >
        {isVideoEnabled ? 'Video Off' : 'Video On'}
      </button>

      <button
        className="control-btn leave"
        onClick={onLeave}
        title="Leave room"
      >
        Leave
      </button>
    </div>
  );
}
