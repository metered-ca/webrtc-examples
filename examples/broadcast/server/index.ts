import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3002;

interface BroadcasterInfo {
  peerId: string;
  username: string;
  ws: WebSocket;
}

interface ViewerInfo {
  peerId: string;
  username: string;
  ws: WebSocket;
}

interface BroadcastRoom {
  broadcastId: string;
  broadcaster: BroadcasterInfo | null;
  viewers: Map<string, ViewerInfo>;
  isLive: boolean;
}

const broadcasts = new Map<string, BroadcastRoom>();

const wss = new WebSocketServer({ port: PORT });

function generateBroadcastId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws: WebSocket) => {
  let currentBroadcastId: string | null = null;
  let currentPeerId: string | null = null;
  let currentUsername: string = 'Anonymous';
  let currentRole: 'broadcaster' | 'viewer' | null = null;

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        // Broadcaster creates a new broadcast room
        case 'create-broadcast': {
          const { peerId, username } = message;
          const broadcastId = generateBroadcastId();

          currentBroadcastId = broadcastId;
          currentPeerId = peerId;
          currentUsername = username || 'Broadcaster';
          currentRole = 'broadcaster';

          const room: BroadcastRoom = {
            broadcastId,
            broadcaster: { peerId, username: currentUsername, ws },
            viewers: new Map(),
            isLive: false,
          };

          broadcasts.set(broadcastId, room);

          ws.send(JSON.stringify({
            type: 'broadcast-created',
            broadcastId,
          }));

          console.log(`Broadcast ${broadcastId} created by ${currentUsername} (${peerId})`);
          break;
        }

        // Broadcaster starts streaming (goes live)
        case 'start-broadcast': {
          const { broadcastId } = message;
          const room = broadcasts.get(broadcastId);

          if (room && room.broadcaster?.peerId === currentPeerId) {
            room.isLive = true;

            // Notify all waiting viewers that broadcast started
            room.viewers.forEach((viewer) => {
              if (viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({
                  type: 'broadcast-started',
                  broadcastId,
                }));
              }
            });

            console.log(`Broadcast ${broadcastId} is now live. Viewers: ${room.viewers.size}`);
          }
          break;
        }

        // Broadcaster ends the broadcast
        case 'end-broadcast': {
          const { broadcastId } = message;
          const room = broadcasts.get(broadcastId);

          if (room && room.broadcaster?.peerId === currentPeerId) {
            room.isLive = false;

            // Notify all viewers that broadcast ended
            room.viewers.forEach((viewer) => {
              if (viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({
                  type: 'broadcast-ended',
                  broadcastId,
                }));
              }
            });

            console.log(`Broadcast ${broadcastId} ended`);
          }
          break;
        }

        // Viewer joins a broadcast
        case 'join-broadcast': {
          const { broadcastId, peerId, username } = message;
          const room = broadcasts.get(broadcastId);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Broadcast not found',
            }));
            return;
          }

          currentBroadcastId = broadcastId;
          currentPeerId = peerId;
          currentUsername = username || 'Viewer';
          currentRole = 'viewer';

          room.viewers.set(peerId, { peerId, username: currentUsername, ws });

          // Send broadcast info to the viewer
          ws.send(JSON.stringify({
            type: 'broadcast-info',
            broadcastId,
            isLive: room.isLive,
            broadcasterUsername: room.broadcaster?.username || 'Unknown',
          }));

          // Notify broadcaster about new viewer (so they can create peer connection)
          if (room.broadcaster && room.broadcaster.ws.readyState === WebSocket.OPEN) {
            room.broadcaster.ws.send(JSON.stringify({
              type: 'viewer-joined',
              peerId,
              username: currentUsername,
            }));

            // Send updated viewer count
            room.broadcaster.ws.send(JSON.stringify({
              type: 'viewer-count',
              count: room.viewers.size,
            }));
          }

          console.log(`Viewer ${currentUsername} (${peerId}) joined broadcast ${broadcastId}. Viewers: ${room.viewers.size}`);
          break;
        }

        // Viewer leaves the broadcast
        case 'leave-broadcast': {
          const { broadcastId, peerId } = message;
          const room = broadcasts.get(broadcastId);

          if (room) {
            room.viewers.delete(peerId);

            // Notify broadcaster
            if (room.broadcaster && room.broadcaster.ws.readyState === WebSocket.OPEN) {
              room.broadcaster.ws.send(JSON.stringify({
                type: 'viewer-left',
                peerId,
              }));

              room.broadcaster.ws.send(JSON.stringify({
                type: 'viewer-count',
                count: room.viewers.size,
              }));
            }

            console.log(`Viewer ${currentUsername} left broadcast ${broadcastId}. Viewers: ${room.viewers.size}`);
          }
          break;
        }

        // WebRTC signaling: offer (broadcaster -> viewer)
        case 'offer': {
          const { to, sdp } = message;
          const room = broadcasts.get(currentBroadcastId!);

          if (room) {
            const viewer = room.viewers.get(to);
            if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
              viewer.ws.send(JSON.stringify({
                type: 'offer',
                from: currentPeerId,
                sdp,
              }));
            }
          }
          break;
        }

        // WebRTC signaling: answer (viewer -> broadcaster)
        case 'answer': {
          const { to, sdp } = message;
          const room = broadcasts.get(currentBroadcastId!);

          if (room && room.broadcaster && room.broadcaster.ws.readyState === WebSocket.OPEN) {
            room.broadcaster.ws.send(JSON.stringify({
              type: 'answer',
              from: currentPeerId,
              sdp,
            }));
          }
          break;
        }

        // WebRTC signaling: ICE candidate
        case 'ice-candidate': {
          const { to, candidate } = message;
          const room = broadcasts.get(currentBroadcastId!);

          if (room) {
            if (currentRole === 'broadcaster') {
              // Broadcaster sending to viewer
              const viewer = room.viewers.get(to);
              if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({
                  type: 'ice-candidate',
                  from: currentPeerId,
                  candidate,
                }));
              }
            } else {
              // Viewer sending to broadcaster
              if (room.broadcaster && room.broadcaster.ws.readyState === WebSocket.OPEN) {
                room.broadcaster.ws.send(JSON.stringify({
                  type: 'ice-candidate',
                  from: currentPeerId,
                  candidate,
                }));
              }
            }
          }
          break;
        }

        // Chat message
        case 'chat-message': {
          const { broadcastId, text } = message;
          const room = broadcasts.get(broadcastId);

          if (room) {
            const chatMsg = {
              type: 'chat',
              id: `${Date.now()}-${currentPeerId}`,
              from: currentPeerId,
              username: currentUsername,
              text,
              timestamp: Date.now(),
            };

            // Send to broadcaster
            if (room.broadcaster && room.broadcaster.ws.readyState === WebSocket.OPEN) {
              room.broadcaster.ws.send(JSON.stringify(chatMsg));
            }

            // Send to all viewers
            room.viewers.forEach((viewer) => {
              if (viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify(chatMsg));
              }
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentBroadcastId && currentPeerId) {
      const room = broadcasts.get(currentBroadcastId);

      if (room) {
        if (currentRole === 'broadcaster') {
          // Broadcaster disconnected - end broadcast
          room.isLive = false;

          room.viewers.forEach((viewer) => {
            if (viewer.ws.readyState === WebSocket.OPEN) {
              viewer.ws.send(JSON.stringify({
                type: 'broadcast-ended',
                broadcastId: currentBroadcastId,
              }));
            }
          });

          // Clean up room after a delay (allow reconnection)
          setTimeout(() => {
            const currentRoom = broadcasts.get(currentBroadcastId!);
            if (currentRoom && !currentRoom.isLive && currentRoom.viewers.size === 0) {
              broadcasts.delete(currentBroadcastId!);
              console.log(`Broadcast ${currentBroadcastId} cleaned up`);
            }
          }, 30000);

          console.log(`Broadcaster ${currentUsername} disconnected from ${currentBroadcastId}`);
        } else {
          // Viewer disconnected
          room.viewers.delete(currentPeerId);

          if (room.broadcaster && room.broadcaster.ws.readyState === WebSocket.OPEN) {
            room.broadcaster.ws.send(JSON.stringify({
              type: 'viewer-left',
              peerId: currentPeerId,
            }));

            room.broadcaster.ws.send(JSON.stringify({
              type: 'viewer-count',
              count: room.viewers.size,
            }));
          }

          console.log(`Viewer ${currentUsername} disconnected from ${currentBroadcastId}. Viewers: ${room.viewers.size}`);
        }
      }
    }
  });
});

console.log(`Broadcast signaling server running on ws://localhost:${PORT}`);
