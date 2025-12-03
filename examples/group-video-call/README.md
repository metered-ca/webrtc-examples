# Group Video Call

A simple group video call application supporting 3-4 participants using WebRTC mesh topology, React, and TypeScript.

## Features

- Multi-participant video calls (3-4 users)
- Mesh topology (peer-to-peer connections)
- Mute/unmute audio
- Enable/disable video
- Room-based joining

## Prerequisites

- Node.js 18+
- Metered TURN server credentials (get them at https://www.metered.ca/stun-turn/)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure TURN credentials:

Edit `src/utils/turnCredentials.ts` and replace with your Metered credentials:

```typescript
const METERED_DOMAIN = 'your-app.metered.live';
const METERED_API_KEY = 'your-api-key';
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

3. Open http://localhost:5173 in multiple browser windows

4. Enter the same room name in each window and click "Join Room"

## How It Works

### Architecture

This example uses a **mesh topology** where each participant connects directly to every other participant. This works well for small groups (3-4 people) but doesn't scale to larger groups.

```
    A ---- B
    |\    /|
    | \  / |
    |  \/  |
    |  /\  |
    | /  \ |
    |/    \|
    C ---- D
```

### Signaling

The signaling server (`server/index.ts`) handles:
- Room management
- Peer discovery
- Relaying SDP offers/answers
- Relaying ICE candidates

### WebRTC Flow

1. User A joins a room
2. User B joins the same room
3. Server tells B about A (existing peer)
4. B creates an offer and sends it to A via the signaling server
5. A receives the offer, creates an answer, and sends it back
6. Both exchange ICE candidates
7. Connection established, video streams flow directly between peers

### Project Structure

```
group-video-call/
├── server/
│   └── index.ts          # WebSocket signaling server
├── src/
│   ├── components/
│   │   ├── JoinScreen.tsx   # Room join form
│   │   ├── VideoGrid.tsx    # Video layout grid
│   │   ├── VideoTile.tsx    # Individual video element
│   │   └── Controls.tsx     # Audio/video/leave controls
│   ├── hooks/
│   │   ├── useMediaStream.ts  # Camera/mic access
│   │   ├── useSignaling.ts    # WebSocket signaling
│   │   └── useWebRTC.ts       # Peer connection management
│   ├── utils/
│   │   └── turnCredentials.ts # Metered API integration
│   ├── types.ts            # TypeScript interfaces
│   ├── App.tsx             # Main application
│   ├── App.css             # Styles
│   └── main.tsx            # Entry point
└── package.json
```

## TURN Server

This example uses [Metered TURN Server](https://www.metered.ca/stun-turn/) for reliable connectivity. The TURN server relays media when direct peer-to-peer connections aren't possible (e.g., behind symmetric NATs or firewalls).

STUN server: `stun:stun.metered.ca:80`

## Limitations

- Mesh topology limits practical use to 3-4 participants
- No screen sharing (can be added)
- No text chat (can be added)
- Signaling server must be running locally

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
