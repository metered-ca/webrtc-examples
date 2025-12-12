# WebRTC Examples

A collection of standalone WebRTC example applications demonstrating real-time video, audio, and data communication using the [Metered TURN Server](https://www.metered.ca/stun-turn/) service.

## Examples

| Example | Description | Topology | Tech Stack |
|---------|-------------|----------|------------|
| [group-video-call](examples/group-video-call) | Simple group video call with up to 4 participants | Mesh | HTML/CSS/JS |
| [expanded-video-call](examples/expanded-video-call) | Full-featured video call with screen sharing, chat, and device selection | Mesh | React, TypeScript, Tailwind |
| [broadcast](examples/broadcast) | One-to-many live broadcast where one person streams to many viewers | Star | React, TypeScript, Tailwind |

## Getting Started

Each example is self-contained and can be run independently.

### Prerequisites

- Node.js 18+
- npm or yarn

### Running an Example

```bash
# Navigate to the example directory
cd examples/<example-name>

# Install dependencies
npm install

# Start the signaling server (Terminal 1)
npm run server

# Start the development server (Terminal 2)
npm run dev
```

Then open `http://localhost:5173` (or the port shown) in your browser.

## Architecture

### Mesh Topology (group-video-call, expanded-video-call)
Each participant connects directly to every other participant. Best for small groups (2-6 people).

```
    A ←→ B
    ↕ ╲ ↕
    D ←→ C
```

### Star Topology (broadcast)
One broadcaster sends media to all viewers. Viewers don't connect to each other. Scales to many viewers.

```
         Viewer 1
            ↑
            │
Viewer 2 ←─ Broadcaster ─→ Viewer 3
            │
            ↓
         Viewer 4
```

## TURN/STUN Configuration

All examples use the Metered STUN server:

```javascript
const iceServers = [{ urls: 'stun:stun.metered.ca:80' }];
```

For production with users behind restrictive NATs, add TURN credentials:

```javascript
// Fetch TURN credentials from Metered API
const response = await fetch(
  "https://<appname>.metered.live/api/v1/turn/credentials?apiKey=<API_KEY>"
);
const iceServers = await response.json();

const peerConnection = new RTCPeerConnection({ iceServers });
```

## E2E Testing

Tests use Playwright with fake media devices for reliable WebRTC testing.

```bash
cd e2e
npm install

# Run tests for a specific example
TEST_EXAMPLE=group-video-call npm test
TEST_EXAMPLE=expanded-video-call npm test
TEST_EXAMPLE=broadcast npm test
```

### Test Coverage

| Example | Tests | Key Verifications |
|---------|-------|-------------------|
| group-video-call | 17 | Peer connections, video streams |
| expanded-video-call | 18 | Screen sharing, chat, multi-peer |
| broadcast | 16 | One-to-many streaming, viewer count, audio+video |

## Project Structure

```
webrtc-examples/
├── examples/
│   ├── group-video-call/      # Simple mesh video call
│   ├── expanded-video-call/   # Full-featured mesh video call
│   └── broadcast/             # One-to-many broadcast
├── e2e/
│   ├── *.test.ts              # Playwright E2E tests
│   ├── assets/                # Mock media files for testing
│   └── playwright.config.ts   # Test configuration
└── docs/                      # Additional documentation
```

## Key Technologies

- **WebRTC API** - Native browser APIs (`RTCPeerConnection`, `getUserMedia`)
- **WebSocket** - Signaling server for connection establishment
- **React** - UI framework (expanded examples)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Playwright** - E2E testing

## License

MIT

## Resources

- [Metered TURN Server Documentation](https://www.metered.ca/docs/turn-server-service/overview)
- [WebRTC API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)