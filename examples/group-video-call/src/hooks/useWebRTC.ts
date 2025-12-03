import { useRef, useCallback, useState } from 'react';
import { SignalingMessage, RemotePeer, IceServer } from '../types';
import { fetchTurnCredentials } from '../utils/turnCredentials';

interface UseWebRTCProps {
  localStream: MediaStream | null;
  peerId: string;
  sendSignaling: (message: SignalingMessage) => void;
}

interface UseWebRTCReturn {
  remotePeers: RemotePeer[];
  initializeIceServers: () => Promise<void>;
  createPeerConnection: (remotePeerId: string, initiator: boolean) => Promise<void>;
  handleOffer: (remotePeerId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleAnswer: (remotePeerId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (remotePeerId: string, candidate: RTCIceCandidateInit) => Promise<void>;
  removePeer: (remotePeerId: string) => void;
  closeAllConnections: () => void;
}

export function useWebRTC({
  localStream,
  peerId,
  sendSignaling
}: UseWebRTCProps): UseWebRTCReturn {
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<IceServer[]>([
    { urls: 'stun:stun.metered.ca:80' }
  ]);

  const initializeIceServers = useCallback(async () => {
    try {
      const servers = await fetchTurnCredentials();
      iceServersRef.current = servers;
    } catch (err) {
      console.warn('Failed to fetch TURN credentials, using STUN only:', err);
    }
  }, []);

  const createPeerConnection = useCallback(async (remotePeerId: string, initiator: boolean) => {
    if (peerConnectionsRef.current.has(remotePeerId)) {
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current
    });

    peerConnectionsRef.current.set(remotePeerId, pc);

    // Add local tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemotePeers(prev => {
        const existing = prev.find(p => p.peerId === remotePeerId);
        if (existing) {
          return prev.map(p =>
            p.peerId === remotePeerId ? { ...p, stream: remoteStream } : p
          );
        }
        return [...prev, { peerId: remotePeerId, stream: remoteStream }];
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignaling({
          type: 'ice-candidate',
          from: peerId,
          to: remotePeerId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remotePeerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        console.log(`Connection with ${remotePeerId} failed, attempting ICE restart`);
        pc.restartIce();
      }
    };

    // If we're the initiator, create and send an offer
    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignaling({
        type: 'offer',
        from: peerId,
        to: remotePeerId,
        sdp: pc.localDescription!
      });
    }

    // Add peer to remote peers list (stream will be updated when track arrives)
    setRemotePeers(prev => {
      if (!prev.find(p => p.peerId === remotePeerId)) {
        return [...prev, { peerId: remotePeerId, stream: null }];
      }
      return prev;
    });
  }, [localStream, peerId, sendSignaling]);

  const handleOffer = useCallback(async (remotePeerId: string, sdp: RTCSessionDescriptionInit) => {
    // Create peer connection if it doesn't exist
    if (!peerConnectionsRef.current.has(remotePeerId)) {
      await createPeerConnection(remotePeerId, false);
    }

    const pc = peerConnectionsRef.current.get(remotePeerId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // Process any pending ICE candidates
    const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current.delete(remotePeerId);

    // Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignaling({
      type: 'answer',
      from: peerId,
      to: remotePeerId,
      sdp: pc.localDescription!
    });
  }, [createPeerConnection, peerId, sendSignaling]);

  const handleAnswer = useCallback(async (remotePeerId: string, sdp: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(remotePeerId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // Process any pending ICE candidates
    const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current.delete(remotePeerId);
  }, []);

  const handleIceCandidate = useCallback(async (remotePeerId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(remotePeerId);

    if (pc?.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      // Queue the candidate if remote description is not set yet
      if (!pendingCandidatesRef.current.has(remotePeerId)) {
        pendingCandidatesRef.current.set(remotePeerId, []);
      }
      pendingCandidatesRef.current.get(remotePeerId)!.push(candidate);
    }
  }, []);

  const removePeer = useCallback((remotePeerId: string) => {
    const pc = peerConnectionsRef.current.get(remotePeerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(remotePeerId);
    }
    pendingCandidatesRef.current.delete(remotePeerId);
    setRemotePeers(prev => prev.filter(p => p.peerId !== remotePeerId));
  }, []);

  const closeAllConnections = useCallback(() => {
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setRemotePeers([]);
  }, []);

  return {
    remotePeers,
    initializeIceServers,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer,
    closeAllConnections
  };
}
