import { useRef, useCallback, useEffect } from 'react';
import type { SignalingMessage } from '../types';

const SIGNALING_SERVER_URL = 'ws://localhost:3002';

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
  onDisconnected,
}: UseSignalingProps): UseSignalingReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(SIGNALING_SERVER_URL);

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
        const message = JSON.parse(event.data) as SignalingMessage;
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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
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
    isConnected: isConnectedRef.current,
  };
}
