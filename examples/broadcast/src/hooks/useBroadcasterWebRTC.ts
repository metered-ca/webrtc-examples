import { useState, useRef, useCallback, useEffect } from 'react';
import type { SignalingMessage, ViewerInfo } from '../types';

interface UseBroadcasterWebRTCProps {
  localStream: MediaStream | null;
  peerId: string;
  sendSignaling: (message: SignalingMessage) => void;
}

interface UseBroadcasterWebRTCReturn {
  viewers: ViewerInfo[];
  viewerCount: number;
  createConnectionForViewer: (viewerPeerId: string, viewerUsername: string) => Promise<void>;
  handleAnswer: (viewerPeerId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (viewerPeerId: string, candidate: RTCIceCandidateInit) => Promise<void>;
  removeViewer: (viewerPeerId: string) => void;
  closeAllConnections: () => void;
}

// Use only Metered STUN server
const ICE_SERVERS = [{ urls: 'stun:stun.metered.ca:80' }];

export function useBroadcasterWebRTC({
  localStream,
  peerId,
  sendSignaling,
}: UseBroadcasterWebRTCProps): UseBroadcasterWebRTCReturn {
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [viewerCount, setViewerCount] = useState(0);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Create peer connection for a new viewer
  const createConnectionForViewer = useCallback(
    async (viewerPeerId: string, viewerUsername: string) => {
      if (peerConnectionsRef.current.has(viewerPeerId)) {
        console.log(`Connection already exists for viewer ${viewerPeerId}`);
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionsRef.current.set(viewerPeerId, pc);

      // Add viewer to state
      setViewers((prev) => {
        if (!prev.find((v) => v.peerId === viewerPeerId)) {
          return [...prev, { peerId: viewerPeerId, username: viewerUsername }];
        }
        return prev;
      });
      setViewerCount((prev) => prev + 1);

      // Add local stream tracks (broadcaster sends media to viewer)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignaling({
            type: 'ice-candidate',
            to: viewerPeerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Broadcaster -> Viewer ${viewerPeerId}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          pc.restartIce();
        }
      };

      // Create and send offer to viewer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignaling({
          type: 'offer',
          to: viewerPeerId,
          sdp: pc.localDescription!,
        });

        console.log(`Sent offer to viewer ${viewerPeerId}`);
      } catch (err) {
        console.error('Error creating offer for viewer:', err);
      }
    },
    [sendSignaling, peerId]
  );

  // Handle answer from viewer
  const handleAnswer = useCallback(async (viewerPeerId: string, sdp: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(viewerPeerId);
    if (!pc) {
      console.warn(`No connection found for viewer ${viewerPeerId}`);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(viewerPeerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current.delete(viewerPeerId);

      console.log(`Received answer from viewer ${viewerPeerId}`);
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  // Handle ICE candidate from viewer
  const handleIceCandidate = useCallback(
    async (viewerPeerId: string, candidate: RTCIceCandidateInit) => {
      const pc = peerConnectionsRef.current.get(viewerPeerId);

      if (!pc || !pc.remoteDescription) {
        // Queue the candidate
        const pending = pendingCandidatesRef.current.get(viewerPeerId) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(viewerPeerId, pending);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    },
    []
  );

  // Remove a viewer connection
  const removeViewer = useCallback((viewerPeerId: string) => {
    const pc = peerConnectionsRef.current.get(viewerPeerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(viewerPeerId);
    }

    pendingCandidatesRef.current.delete(viewerPeerId);
    setViewers((prev) => prev.filter((v) => v.peerId !== viewerPeerId));
    setViewerCount((prev) => Math.max(0, prev - 1));

    console.log(`Removed viewer ${viewerPeerId}`);
  }, []);

  // Close all connections
  const closeAllConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setViewers([]);
    setViewerCount(0);
  }, []);

  return {
    viewers,
    viewerCount,
    createConnectionForViewer,
    handleAnswer,
    handleIceCandidate,
    removeViewer,
    closeAllConnections,
  };
}
