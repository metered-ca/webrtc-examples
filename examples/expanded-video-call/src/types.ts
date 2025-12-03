// Signaling message types
export type SignalingMessageType =
  | 'join'
  | 'peer-joined'
  | 'peer-left'
  | 'room-peers'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'screen-share-started'
  | 'screen-share-stopped'
  | 'username-update';

export interface SignalingMessage {
  type: SignalingMessageType;
  peerId?: string;
  roomId?: string;
  from?: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  peers?: PeerInfo[];
  username?: string;
  isScreenShare?: boolean;
}

export interface PeerInfo {
  peerId: string;
  username: string;
}

export interface RemotePeer {
  peerId: string;
  username: string;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

// App state types
export type AppView = 'home' | 'lobby' | 'call';

export interface UserSettings {
  username: string;
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}
