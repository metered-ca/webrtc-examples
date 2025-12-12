# One-to-Many Broadcast

A live broadcasting application where one person streams video/audio to many viewers using WebRTC star topology, React, and TypeScript.

## Features

- One broadcaster streams to unlimited viewers
- Star topology (broadcaster connects to each viewer individually)
- Real-time viewer count
- Live chat between broadcaster and viewers
- Shareable 6-character broadcast codes
- Audio/video toggle for broadcaster
- Mute/fullscreen controls for viewers

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

1. Install dependencies:

```bash
npm install
```

## Running the Application

1. Start the signaling server:

```bash
npm run server
```

2. In a separate terminal, start the development server:

```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

4. Click "Start Broadcasting" to create a broadcast

5. Share the 6-character code with viewers

6. Viewers enter the code and click "Watch Broadcast"

## How It Works

### Architecture

This example uses a **star topology** where the broadcaster creates a separate peer connection to each viewer. Unlike mesh topology, viewers don't connect to each other - they only receive media from the broadcaster.

```
         Viewer 1
            ^
            |
Viewer 2 <-- Broadcaster --> Viewer 3
            |
            v
         Viewer 4
```

This scales better than mesh for one-to-many scenarios because:
- Broadcaster uploads once per viewer (not n-1 times)
- Viewers only download one stream
- No viewer-to-viewer connections needed

### Signaling

The signaling server (`server/index.ts`) handles:
- Broadcast room creation with unique codes
- Broadcaster/viewer role management
- Viewer join/leave notifications
- Relaying SDP offers/answers between broadcaster and viewers
- Broadcasting chat messages to all participants

### WebRTC Flow

1. Broadcaster creates a broadcast room, gets a 6-character code
2. Broadcaster clicks "Go Live" - broadcast is now active
3. Viewer joins with the broadcast code
4. Server notifies broadcaster of new viewer
5. Broadcaster creates RTCPeerConnection for that viewer
6. Broadcaster sends offer to viewer (with video/audio tracks)
7. Viewer receives offer, creates answer
8. ICE candidates exchanged
9. Viewer receives broadcaster's video/audio stream

### Project Structure

```
broadcast/
├── server/
│   └── index.ts              # WebSocket signaling server
├── src/
│   ├── components/
│   │   ├── Home.tsx              # Landing page
│   │   ├── BroadcasterLobby.tsx  # Pre-broadcast setup
│   │   ├── ViewerLobby.tsx       # Pre-view waiting room
│   │   ├── BroadcastScreen.tsx   # Live broadcasting UI
│   │   ├── ViewerScreen.tsx      # Viewer watching UI
│   │   ├── Chat.tsx              # Chat panel
│   │   └── ViewerList.tsx        # List of connected viewers
│   ├── hooks/
│   │   ├── useSignaling.ts           # WebSocket signaling
│   │   ├── useBroadcasterWebRTC.ts   # Broadcaster peer connections (1:many)
│   │   ├── useViewerWebRTC.ts        # Viewer peer connection (1:1)
│   │   ├── useMediaStream.ts         # Camera/mic access
│   │   └── useMediaDevices.ts        # Device enumeration
│   ├── utils/
│   │   └── routing.ts            # URL routing helpers
│   ├── types.ts                  # TypeScript interfaces
│   ├── App.tsx                   # Main application
│   └── main.tsx                  # Entry point
└── package.json
```

## Message Protocol

### Broadcaster Messages
| Message | Description |
|---------|-------------|
| `create-broadcast` | Create a new broadcast room |
| `start-broadcast` | Go live and accept viewers |
| `end-broadcast` | End the broadcast |
| `offer` | SDP offer to a specific viewer |
| `ice-candidate` | ICE candidate to a specific viewer |
| `chat-message` | Send chat to all participants |

### Viewer Messages
| Message | Description |
|---------|-------------|
| `join-broadcast` | Join an existing broadcast |
| `leave-broadcast` | Leave the broadcast |
| `answer` | SDP answer to broadcaster |
| `ice-candidate` | ICE candidate to broadcaster |
| `chat-message` | Send chat message |

### Server Messages
| Message | Description |
|---------|-------------|
| `broadcast-created` | Confirms room creation with code |
| `broadcast-info` | Broadcast details for viewer |
| `viewer-joined` | Notifies broadcaster of new viewer |
| `viewer-left` | Notifies broadcaster viewer left |
| `viewer-count` | Updated viewer count |
| `broadcast-ended` | Notifies viewers broadcast ended |

## TURN Server

This example uses [Metered STUN Server](https://www.metered.ca/stun-turn/) for ICE connectivity:


For production with users behind restrictive NATs, add TURN credentials from your Metered dashboard.

## Comparison with Other Examples

| Feature | group-video-call | expanded-video-call | broadcast |
|---------|-----------------|---------------------|-----------|
| Topology | Mesh | Mesh | Star |
| Participants | 3-4 | 6+ | 1 + many |
| Media Direction | Bidirectional | Bidirectional | One-way |
| Screen Share | No | Yes | No |
| Chat | No | Yes (P2P) | Yes (Server) |
| Use Case | Small meetings | Team calls | Live streaming |

## Limitations

- No adaptive bitrate (all viewers get same quality)
- No recording functionality
- No screen sharing (broadcaster camera only)
- Single broadcaster per room
- Chat relayed through server (not P2P)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## E2E Tests

Run the broadcast-specific tests:

```bash
cd ../../e2e
TEST_EXAMPLE=broadcast npm test
```

Tests verify:
- Broadcaster can go live
- Viewers receive video AND audio streams
- Multiple viewers can join simultaneously
- Chat messages are delivered
- Viewer count updates correctly
- Broadcast end notifications work
