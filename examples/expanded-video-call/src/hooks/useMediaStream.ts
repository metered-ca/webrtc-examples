import { useState, useRef, useCallback } from 'react';

interface UseMediaStreamProps {
  selectedCameraId?: string | null;
  selectedMicrophoneId?: string | null;
}

interface UseMediaStreamReturn {
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;
  startMedia: (options?: { video?: boolean; audio?: boolean }) => Promise<MediaStream>;
  stopMedia: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
}

export function useMediaStream({
  selectedCameraId,
  selectedMicrophoneId,
}: UseMediaStreamProps = {}): UseMediaStreamReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const startMedia = useCallback(
    async (options: { video?: boolean; audio?: boolean } = { video: true, audio: true }) => {
      try {
        // Stop existing stream if any
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: options.video !== false
            ? {
                deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
          audio: options.audio !== false
            ? {
                deviceId: selectedMicrophoneId ? { exact: selectedMicrophoneId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        streamRef.current = stream;
        setLocalStream(stream);
        setIsAudioEnabled(options.audio !== false);
        setIsVideoEnabled(options.video !== false);
        setError(null);

        return stream;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access media devices';
        setError(message);
        console.error('Error accessing media devices:', err);
        throw err;
      }
    },
    [selectedCameraId, selectedMicrophoneId]
  );

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const switchCamera = useCallback(
    async (deviceId: string) => {
      if (!streamRef.current) return;

      try {
        // Get new video track
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        const newVideoTrack = newStream.getVideoTracks()[0];

        // Stop old video track
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          streamRef.current.removeTrack(oldVideoTrack);
        }

        // Add new video track
        streamRef.current.addTrack(newVideoTrack);

        // Preserve enabled state
        newVideoTrack.enabled = isVideoEnabled;

        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch camera';
        setError(message);
        console.error('Error switching camera:', err);
      }
    },
    [isVideoEnabled]
  );

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      if (!streamRef.current) return;

      try {
        // Get new audio track
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const newAudioTrack = newStream.getAudioTracks()[0];

        // Stop old audio track
        const oldAudioTrack = streamRef.current.getAudioTracks()[0];
        if (oldAudioTrack) {
          oldAudioTrack.stop();
          streamRef.current.removeTrack(oldAudioTrack);
        }

        // Add new audio track
        streamRef.current.addTrack(newAudioTrack);

        // Preserve enabled state
        newAudioTrack.enabled = isAudioEnabled;

        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch microphone';
        setError(message);
        console.error('Error switching microphone:', err);
      }
    },
    [isAudioEnabled]
  );

  return {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    error,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    switchCamera,
    switchMicrophone,
  };
}
