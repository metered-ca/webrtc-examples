import { useState, useRef, useCallback } from 'react';
import type { SignalingMessage } from '../types';

interface UseViewerWebRTCProps {
  peerId: string;
  sendSignaling: (message: SignalingMessage) => void;
}

interface UseViewerWebRTCReturn {
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | null;
  handleOffer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  closeConnection: () => void;
}

// Use only Metered STUN server
const ICE_SERVERS = [{ urls: 'stun:stun.metered.ca:80' }];

export function useViewerWebRTC({
  peerId,
  sendSignaling,
}: UseViewerWebRTCProps): UseViewerWebRTCReturn {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Handle offer from broadcaster
  const handleOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    // Create peer connection if it doesn't exist
    if (!peerConnectionRef.current) {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      // Handle incoming tracks from broadcaster
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        setRemoteStream(stream);
        console.log('Received remote stream from broadcaster');
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignaling({
            type: 'ice-candidate',
            to: 'broadcaster', // Server will route to broadcaster
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        console.log(`Viewer connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          pc.restartIce();
        }
      };
    }

    const pc = peerConnectionRef.current;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignaling({
        type: 'answer',
        to: 'broadcaster', // Server will route to broadcaster
        sdp: pc.localDescription!,
      });

      console.log('Sent answer to broadcaster');
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [sendSignaling, peerId]);

  // Handle ICE candidate from broadcaster
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;

    if (!pc || !pc.remoteDescription) {
      // Queue the candidate
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }, []);

  // Close the connection
  const closeConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
    setConnectionState(null);
  }, []);

  return {
    remoteStream,
    connectionState,
    handleOffer,
    handleIceCandidate,
    closeConnection,
  };
}
