import { useState, useEffect, useCallback } from 'react';
import type { MediaDevice } from '../types';

interface UseMediaDevicesReturn {
  cameras: MediaDevice[];
  microphones: MediaDevice[];
  speakers: MediaDevice[];
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  setSelectedCameraId: (deviceId: string) => void;
  setSelectedMicrophoneId: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  hasPermissions: boolean;
  error: string | null;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [speakers, setSpeakers] = useState<MediaDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoInputs: MediaDevice[] = [];
      const audioInputs: MediaDevice[] = [];
      const audioOutputs: MediaDevice[] = [];

      devices.forEach((device, index) => {
        const option: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${index + 1}`,
        };

        if (device.kind === 'videoinput') {
          videoInputs.push(option);
        } else if (device.kind === 'audioinput') {
          audioInputs.push(option);
        } else if (device.kind === 'audiooutput') {
          audioOutputs.push(option);
        }
      });

      setCameras(videoInputs);
      setMicrophones(audioInputs);
      setSpeakers(audioOutputs);

      const hasLabels = devices.some(d => d.label !== '');
      setHasPermissions(hasLabels);

      if (!selectedCameraId && videoInputs.length > 0) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
      if (!selectedMicrophoneId && audioInputs.length > 0) {
        setSelectedMicrophoneId(audioInputs[0].deviceId);
      }

      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enumerate devices';
      setError(message);
      console.error('Error enumerating devices:', err);
    }
  }, [selectedCameraId, selectedMicrophoneId]);

  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  return {
    cameras,
    microphones,
    speakers,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCameraId,
    setSelectedMicrophoneId,
    refreshDevices,
    hasPermissions,
    error,
  };
}
