import { MediaStream as RNMediaStream } from 'react-native-webrtc';

export interface SignalingMessage {
  type: 'join' | 'peer-joined' | 'peer-left' | 'room-peers' | 'offer' | 'answer' | 'ice-candidate';
  peerId?: string;
  roomId?: string;
  from?: string;
  to?: string;
  sdp?: { sdp: string; type: string | null };
  candidate?: { candidate?: string; sdpMLineIndex?: number | null; sdpMid?: string | null };
  peers?: string[];
}

export interface RemotePeer {
  peerId: string;
  stream: RNMediaStream | null;
}

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}
