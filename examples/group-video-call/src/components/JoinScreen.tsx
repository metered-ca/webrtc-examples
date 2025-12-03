import { useState } from 'react';

interface JoinScreenProps {
  onJoin: (roomId: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function JoinScreen({ onJoin, isLoading, error }: JoinScreenProps) {
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      onJoin(roomId.trim());
    }
  };

  return (
    <div className="join-screen">
      <div className="join-container">
        <h1>Group Video Call</h1>
        <p>Enter a room name to join or create a video call</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room name"
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" disabled={isLoading || !roomId.trim()}>
            {isLoading ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
