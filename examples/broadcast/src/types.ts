// Broadcast roles
export type BroadcastRole = 'broadcaster' | 'viewer';

// Viewer information
export interface ViewerInfo {
  peerId: string;
  username: string;
}

// Chat message
export interface ChatMessage {
  id: string;
  from: string;
  username: string;
  text: string;
  timestamp: number;
}

// Broadcast state
export interface BroadcastState {
  broadcastId: string | null;
  isLive: boolean;
  broadcasterUsername: string | null;
  viewerCount: number;
}

// Signaling message types
export type SignalingMessage =
  // Broadcaster -> Server
  | { type: 'create-broadcast'; peerId: string; username: string }
  | { type: 'start-broadcast'; broadcastId: string }
  | { type: 'end-broadcast'; broadcastId: string }
  // Viewer -> Server
  | { type: 'join-broadcast'; broadcastId: string; peerId: string; username: string }
  | { type: 'leave-broadcast'; broadcastId: string; peerId: string }
  // Bidirectional signaling
  | { type: 'offer'; to: string; sdp: RTCSessionDescriptionInit; from?: string }
  | { type: 'answer'; to: string; sdp: RTCSessionDescriptionInit; from?: string }
  | { type: 'ice-candidate'; to: string; candidate: RTCIceCandidateInit; from?: string }
  // Chat
  | { type: 'chat-message'; broadcastId: string; text: string }
  // Server -> Client
  | { type: 'broadcast-created'; broadcastId: string }
  | { type: 'broadcast-started'; broadcastId: string }
  | { type: 'broadcast-ended'; broadcastId: string }
  | { type: 'broadcast-info'; broadcastId: string; isLive: boolean; broadcasterUsername: string }
  | { type: 'viewer-joined'; peerId: string; username: string }
  | { type: 'viewer-left'; peerId: string }
  | { type: 'viewer-count'; count: number }
  | { type: 'chat'; id: string; from: string; username: string; text: string; timestamp: number }
  | { type: 'error'; message: string };

// App view states
export type AppView =
  | 'home'
  | 'broadcaster-lobby'
  | 'viewer-lobby'
  | 'broadcasting'
  | 'viewing';

// Media device
export interface MediaDevice {
  deviceId: string;
  label: string;
}
