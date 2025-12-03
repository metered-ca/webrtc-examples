import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;

interface PeerInfo {
  peerId: string;
  username: string;
  ws: WebSocket;
  isScreenSharing: boolean;
}

const rooms = new Map<string, Map<string, PeerInfo>>();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let currentPeerId: string | null = null;
  let currentUsername: string = 'Anonymous';

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'join': {
          const { roomId, peerId, username } = message;
          currentRoomId = roomId;
          currentPeerId = peerId;
          currentUsername = username || 'Anonymous';

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }

          const room = rooms.get(roomId)!;

          // Get existing peers info (id, username, screen sharing status)
          const existingPeers = Array.from(room.values()).map(p => ({
            peerId: p.peerId,
            username: p.username,
            isScreenSharing: p.isScreenSharing
          }));

          room.set(peerId, {
            peerId,
            username: currentUsername,
            ws,
            isScreenSharing: false
          });

          // Send list of existing peers to the new peer
          ws.send(JSON.stringify({
            type: 'room-peers',
            peers: existingPeers
          }));

          // Notify existing peers about the new peer
          broadcast(roomId, {
            type: 'peer-joined',
            peerId,
            username: currentUsername
          }, peerId);

          console.log(`Peer ${peerId} (${currentUsername}) joined room ${roomId}. Room size: ${room.size}`);
          break;
        }

        case 'username-update': {
          if (currentRoomId && currentPeerId) {
            const room = rooms.get(currentRoomId);
            if (room) {
              const peer = room.get(currentPeerId);
              if (peer) {
                peer.username = message.username;
                currentUsername = message.username;

                // Notify all peers about the username change
                broadcast(currentRoomId, {
                  type: 'username-update',
                  peerId: currentPeerId,
                  username: message.username
                }, currentPeerId);
              }
            }
          }
          break;
        }

        case 'screen-share-started': {
          if (currentRoomId && currentPeerId) {
            const room = rooms.get(currentRoomId);
            if (room) {
              const peer = room.get(currentPeerId);
              if (peer) {
                peer.isScreenSharing = true;
              }
            }

            broadcast(currentRoomId, {
              type: 'screen-share-started',
              peerId: currentPeerId
            }, currentPeerId);
          }
          break;
        }

        case 'screen-share-stopped': {
          if (currentRoomId && currentPeerId) {
            const room = rooms.get(currentRoomId);
            if (room) {
              const peer = room.get(currentPeerId);
              if (peer) {
                peer.isScreenSharing = false;
              }
            }

            broadcast(currentRoomId, {
              type: 'screen-share-stopped',
              peerId: currentPeerId
            }, currentPeerId);
          }
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const { to } = message;
          forwardToPeer(currentRoomId!, to, {
            ...message,
            from: currentPeerId,
            username: currentUsername
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPeerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.delete(currentPeerId);

        broadcast(currentRoomId, {
          type: 'peer-left',
          peerId: currentPeerId
        }, currentPeerId);

        console.log(`Peer ${currentPeerId} (${currentUsername}) left room ${currentRoomId}. Room size: ${room.size}`);

        if (room.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
  });
});

function forwardToPeer(roomId: string, toPeerId: string, message: unknown) {
  const room = rooms.get(roomId);
  if (room) {
    const peer = room.get(toPeerId);
    if (peer && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify(message));
    }
  }
}

function broadcast(roomId: string, message: unknown, excludePeerId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.forEach((peer) => {
      if (peer.peerId !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify(message));
      }
    });
  }
}

console.log(`Signaling server running on ws://localhost:${PORT}`);
