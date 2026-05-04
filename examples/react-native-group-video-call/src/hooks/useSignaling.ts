import { useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { SignalingMessage } from '../types';

// Android emulator uses 10.0.2.2 to reach the host machine.
// iOS simulator can use localhost.
// For physical devices, replace with your machine's LAN IP (e.g., 'ws://192.168.1.100:3003').
const SIGNALING_SERVER_URL = Platform.select({
  android: 'ws://10.0.2.2:3003',
  ios: 'ws://localhost:3003',
  default: 'ws://localhost:3003',
});

interface UseSignalingProps {
  onMessage: (message: SignalingMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseSignalingReturn {
  connect: () => void;
  disconnect: () => void;
  send: (message: SignalingMessage) => void;
  isConnected: boolean;
}

export function useSignaling({
  onMessage,
  onConnected,
  onDisconnected
}: UseSignalingProps): UseSignalingReturn {
  // Use `any` to avoid type conflicts between Node.js and RN WebSocket definitions
  const wsRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === globalThis.WebSocket.OPEN) {
      return;
    }

    const ws = new globalThis.WebSocket(SIGNALING_SERVER_URL);

    ws.onopen = () => {
      isConnectedRef.current = true;
      onConnected?.();
    };

    ws.onclose = () => {
      isConnectedRef.current = false;
      onDisconnected?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as SignalingMessage;
        onMessage(message);
      } catch (err) {
        console.error('Failed to parse signaling message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [onMessage, onConnected, onDisconnected]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  const send = useCallback((message: SignalingMessage) => {
    if (wsRef.current?.readyState === globalThis.WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    send,
    isConnected: isConnectedRef.current
  };
}
