import { useState, useCallback, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

interface UseMediaStreamReturn {
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;
  startMedia: () => Promise<void>;
  stopMedia: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
}

async function requestAndroidPermissions(): Promise<boolean> {
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
  return (
    granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
    granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export function useMediaStream(): UseMediaStreamReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startMedia = useCallback(async () => {
    try {
      setError(null);

      if (Platform.OS === 'android') {
        const granted = await requestAndroidPermissions();
        if (!granted) {
          throw new Error('Camera and microphone permissions are required');
        }
      }

      const stream = await mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      }) as MediaStream;

      streamRef.current = stream;
      setLocalStream(stream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access media devices';
      setError(message);
      throw err;
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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

  const switchCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        (videoTrack as any)._switchCamera();
      }
    }
  }, []);

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
  };
}
