import { useState, useRef, useCallback, useEffect } from 'react';
import type { RemotePeer, IceServer, SignalingMessage, ChatMessage } from '../types';

interface UseWebRTCProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  peerId: string;
  username: string;
  sendSignaling: (message: SignalingMessage) => void;
  onChatMessage?: (message: ChatMessage) => void;
}

interface UseWebRTCReturn {
  remotePeers: RemotePeer[];
  initializeIceServers: () => Promise<void>;
  createPeerConnection: (remotePeerId: string, remoteUsername: string, initiator: boolean) => Promise<void>;
  handleOffer: (remotePeerId: string, remoteUsername: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleAnswer: (remotePeerId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (remotePeerId: string, candidate: RTCIceCandidateInit) => Promise<void>;
  removePeer: (remotePeerId: string) => void;
  closeAllConnections: () => void;
  sendChatMessage: (text: string) => void;
  addScreenShareTrack: (stream: MediaStream) => void;
  removeScreenShareTrack: () => void;
  updatePeerUsername: (peerId: string, username: string) => void;
  clearPeerScreenStream: (peerId: string) => void;
}

export function useWebRTC({
  localStream,
  screenStream,
  peerId,
  username,
  sendSignaling,
  onChatMessage,
}: UseWebRTCProps): UseWebRTCReturn {
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<IceServer[]>([
    { urls: 'stun:stun.metered.ca:80' }
  ]);

  // Refs for current values to avoid stale closures
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const usernameRef = useRef(username);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const initializeIceServers = useCallback(async () => {
    // For this example, we just use STUN. In production, you'd fetch TURN credentials.
    // Keep the default STUN server
  }, []);

  const setupDataChannel = useCallback((channel: RTCDataChannel, remotePeerId: string) => {
    channel.onopen = () => {
      console.log(`Data channel opened with ${remotePeerId}`);
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${remotePeerId}`);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        onChatMessage?.(message);
      } catch (err) {
        console.error('Failed to parse data channel message:', err);
      }
    };

    dataChannelsRef.current.set(remotePeerId, channel);
  }, [onChatMessage]);

  const createPeerConnection = useCallback(
    async (remotePeerId: string, remoteUsername: string, initiator: boolean) => {
      if (peerConnectionsRef.current.has(remotePeerId)) {
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
      });

      peerConnectionsRef.current.set(remotePeerId, pc);

      // Add remote peer to state
      setRemotePeers((prev) => {
        if (!prev.find((p) => p.peerId === remotePeerId)) {
          return [...prev, { peerId: remotePeerId, username: remoteUsername, stream: null, screenStream: null }];
        }
        return prev;
      });

      // Add local tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Add screen share track if sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, screenStreamRef.current!);
        });
      }

      // Create data channel if initiator
      if (initiator) {
        const dataChannel = pc.createDataChannel('chat');
        setupDataChannel(dataChannel, remotePeerId);
      }

      // Handle incoming data channel
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, remotePeerId);
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;

        setRemotePeers((prev) => {
          const existing = prev.find((p) => p.peerId === remotePeerId);
          if (existing) {
            return prev.map((p) => {
              if (p.peerId === remotePeerId) {
                // Simple heuristic: if we already have a stream and this is a different one,
                // it's likely a screen share
                if (p.stream && remoteStream.id !== p.stream.id) {
                  return { ...p, screenStream: remoteStream };
                }
                return { ...p, stream: remoteStream };
              }
              return p;
            });
          }
          return [...prev, { peerId: remotePeerId, username: remoteUsername, stream: remoteStream, screenStream: null }];
        });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignaling({
            type: 'ice-candidate',
            to: remotePeerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${remotePeerId}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          // Attempt ICE restart
          pc.restartIce();
        }
      };

      // If initiator, create and send offer
      if (initiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          sendSignaling({
            type: 'offer',
            to: remotePeerId,
            sdp: pc.localDescription!,
            username: usernameRef.current,
          });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      }
    },
    [sendSignaling, setupDataChannel, remotePeers]
  );

  const handleOffer = useCallback(
    async (remotePeerId: string, remoteUsername: string, sdp: RTCSessionDescriptionInit) => {
      // Create peer connection if it doesn't exist
      if (!peerConnectionsRef.current.has(remotePeerId)) {
        await createPeerConnection(remotePeerId, remoteUsername, false);
      } else {
        // Update username for existing peer (in case it was 'Unknown' before)
        setRemotePeers((prev) =>
          prev.map((p) => (p.peerId === remotePeerId && p.username === 'Unknown' ? { ...p, username: remoteUsername } : p))
        );
      }

      const pc = peerConnectionsRef.current.get(remotePeerId);
      if (!pc) return;

      try {
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
          to: remotePeerId,
          sdp: pc.localDescription!,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    },
    [createPeerConnection, sendSignaling]
  );

  const handleAnswer = useCallback(async (remotePeerId: string, sdp: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(remotePeerId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current.delete(remotePeerId);
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  const handleIceCandidate = useCallback(
    async (remotePeerId: string, candidate: RTCIceCandidateInit) => {
      const pc = peerConnectionsRef.current.get(remotePeerId);

      if (!pc || !pc.remoteDescription) {
        // Queue the candidate
        const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(remotePeerId, pending);
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

  const removePeer = useCallback((remotePeerId: string) => {
    const pc = peerConnectionsRef.current.get(remotePeerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(remotePeerId);
    }

    dataChannelsRef.current.delete(remotePeerId);
    pendingCandidatesRef.current.delete(remotePeerId);

    setRemotePeers((prev) => prev.filter((p) => p.peerId !== remotePeerId));
  }, []);

  const closeAllConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    dataChannelsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setRemotePeers([]);
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    const message: ChatMessage = {
      id: `${peerId}-${Date.now()}`,
      from: peerId,
      username: usernameRef.current,
      text,
      timestamp: Date.now(),
    };

    // Send to all peers via data channels
    dataChannelsRef.current.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(message));
      }
    });

    // Also trigger local message handler for own message
    onChatMessage?.(message);
  }, [peerId, onChatMessage]);

  const addScreenShareTrack = useCallback((stream: MediaStream) => {
    peerConnectionsRef.current.forEach(async (pc, remotePeerId) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Renegotiate the connection to send the new track
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignaling({
          type: 'offer',
          to: remotePeerId,
          sdp: pc.localDescription!,
          username: usernameRef.current,
        });
      } catch (err) {
        console.error('Error renegotiating for screen share:', err);
      }
    });
  }, [sendSignaling]);

  const removeScreenShareTrack = useCallback(() => {
    if (!screenStreamRef.current) return;

    peerConnectionsRef.current.forEach(async (pc, remotePeerId) => {
      const senders = pc.getSenders();
      screenStreamRef.current?.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track === track);
        if (sender) {
          pc.removeTrack(sender);
        }
      });

      // Renegotiate the connection after removing the track
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignaling({
          type: 'offer',
          to: remotePeerId,
          sdp: pc.localDescription!,
          username: usernameRef.current,
        });
      } catch (err) {
        console.error('Error renegotiating after removing screen share:', err);
      }
    });
  }, [sendSignaling]);

  const updatePeerUsername = useCallback((peerId: string, newUsername: string) => {
    setRemotePeers((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, username: newUsername } : p))
    );
  }, []);

  const clearPeerScreenStream = useCallback((peerId: string) => {
    setRemotePeers((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, screenStream: null } : p))
    );
  }, []);

  return {
    remotePeers,
    initializeIceServers,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer,
    closeAllConnections,
    sendChatMessage,
    addScreenShareTrack,
    removeScreenShareTrack,
    updatePeerUsername,
    clearPeerScreenStream,
  };
}
