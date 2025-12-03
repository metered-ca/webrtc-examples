import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3000;

interface Peer {
  peerId: string;
  ws: WebSocket;
}

const rooms = new Map<string, Map<string, Peer>>();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let currentPeerId: string | null = null;

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'join': {
          const { roomId, peerId } = message;
          currentRoomId = roomId;
          currentPeerId = peerId;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }

          const room = rooms.get(roomId)!;
          const existingPeers = Array.from(room.keys());

          room.set(peerId, { peerId, ws });

          // Send list of existing peers to the new peer
          ws.send(JSON.stringify({
            type: 'room-peers',
            peers: existingPeers
          }));

          // Notify existing peers about the new peer
          broadcast(roomId, {
            type: 'peer-joined',
            peerId
          }, peerId);

          console.log(`Peer ${peerId} joined room ${roomId}. Room size: ${room.size}`);
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const { to } = message;
          forwardToPeer(currentRoomId!, to, message);
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

        console.log(`Peer ${currentPeerId} left room ${currentRoomId}. Room size: ${room.size}`);

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
