import { useState, useRef, useCallback } from 'react';

interface UseScreenShareReturn {
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  error: string | null;
  startScreenShare: () => Promise<MediaStream>;
  stopScreenShare: () => void;
}

export function useScreenShare(): UseScreenShareReturn {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      streamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);
      setError(null);

      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen share';
      // Don't set error if user cancelled
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        setError(message);
      }
      console.error('Error starting screen share:', err);
      throw err;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  }, []);

  return {
    screenStream,
    isScreenSharing,
    error,
    startScreenShare,
    stopScreenShare,
  };
}
