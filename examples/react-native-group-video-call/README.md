# React Native Group Video Call

A group video call application for iOS and Android supporting 3-4 participants using WebRTC mesh topology, React Native, and TypeScript. This is the React Native port of the [web-based group video call](../group-video-call) example.

## Features

- Multi-participant video calls (3-4 users)
- Mesh topology (peer-to-peer connections)
- Mute/unmute audio
- Enable/disable video
- Switch front/back camera
- Room-based joining
- Works on iOS and Android

## Prerequisites

- Node.js 22+
- React Native development environment — follow the official [environment setup guide](https://reactnative.dev/docs/set-up-your-environment) for your OS and target platform
- Metered TURN server credentials (get them at https://www.metered.ca/stun-turn/)

### iOS Requirements

- macOS
- Xcode (latest stable recommended)
- iOS Simulator or a physical iOS device
- CocoaPods (`gem install cocoapods` or install via Homebrew)
- Ruby (for CocoaPods — `bundle install` will handle the correct version)

### Android Requirements

- Android Studio with SDK installed
- Android emulator (API 24+) or a physical Android device with USB debugging enabled
- Java Development Kit (JDK 17 recommended)

## Setup

### 1. Install dependencies

```bash
cd examples/react-native-group-video-call
npm install
```

### 2. Configure TURN credentials

Edit `src/utils/turnCredentials.ts` and replace with your Metered credentials:

```typescript
const METERED_DOMAIN = 'your-app.metered.live';
const METERED_API_KEY = 'your-api-key';
```

### 3. iOS setup

Install CocoaPods dependencies:

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

If you don't have `bundler`, you can install pods directly:

```bash
cd ios && pod install && cd ..
```

### 4. Android setup

No additional setup is required. The Android project is pre-configured with the correct permissions and `minSdkVersion` (24).

If you need to adjust the SDK path, create or edit `android/local.properties`:

```
sdk.dir=/path/to/your/Android/sdk
```

## Running the Application

### Start the signaling server

In a terminal, start the WebSocket signaling server:

```bash
npm run server
```

You should see: `Signaling server running on ws://localhost:3003`

### Start the Metro bundler

In a second terminal:

```bash
npm start
```

### Run on iOS

> **First time?** Make sure you've completed the [iOS setup](#3-ios-setup) step (`pod install`) before building.

In a third terminal:

```bash
npm run ios
```

This will:
1. Build the native iOS project
2. Launch the iOS Simulator
3. Install and run the app

To run on a specific simulator:

```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

To run on a physical iOS device, connect it via USB, then:

```bash
npx react-native run-ios --device "Your iPhone Name"
```

> **Note:** Physical devices require a valid Apple Developer signing configuration in Xcode. Open `ios/ReactNativeGroupVideoCall.xcworkspace` in Xcode and configure your signing team under **Signing & Capabilities**.

### Run on Android

> **First time?** Make sure you have Android Studio installed and `ANDROID_HOME` set. See the [Android setup](#4-android-setup) section.

Make sure you have an Android emulator running or a physical device connected, then in a third terminal:

```bash
npm run android
```

This will:
1. Build the native Android project (first build may take several minutes)
2. Install the APK on the emulator/device
3. Launch the app

To check connected devices:

```bash
adb devices
```

To run on a specific device:

```bash
npx react-native run-android --deviceId="emulator-5554"
```

### Testing a video call

1. Run the app on two separate devices or simulators
2. Enter the same room name on both devices
3. Tap **Join Room** on both devices
4. You should see each other's video streams

## Connecting from Physical Devices

The signaling server URL is configured per platform in `src/hooks/useSignaling.ts`:

| Platform | Default URL | Notes |
|----------|------------|-------|
| iOS simulator | `ws://localhost:3003` | Works out of the box |
| Android emulator | `ws://10.0.2.2:3003` | `10.0.2.2` is Android's alias for the host machine |
| Physical device | Must be configured manually | Replace with your machine's LAN IP |

To find your machine's LAN IP:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

Then update `SIGNALING_SERVER_URL` in `src/hooks/useSignaling.ts`:

```typescript
const SIGNALING_SERVER_URL = 'ws://192.168.1.100:3003'; // your LAN IP
```

> **Important:** Both the device and the development machine must be on the same network.

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

### Differences from Web Version

- Uses `react-native-webrtc` to provide the WebRTC API (`RTCPeerConnection`, `getUserMedia`, etc.)
- Video rendering uses `RTCView` component instead of HTML `<video>` elements
- Android requires runtime permission requests for camera and microphone
- Signaling server URL adapts per platform (localhost vs 10.0.2.2 for Android emulator)
- Adds camera switching (front/back) for mobile

### Project Structure

```
react-native-group-video-call/
├── server/
│   └── index.ts              # WebSocket signaling server (port 3003)
├── src/
│   ├── components/
│   │   ├── JoinScreen.tsx     # Room join form
│   │   ├── VideoGrid.tsx      # Video layout grid
│   │   ├── VideoTile.tsx      # RTCView video element
│   │   └── Controls.tsx       # Audio/video/camera/leave controls
│   ├── hooks/
│   │   ├── useMediaStream.ts  # Camera/mic access + permissions
│   │   ├── useSignaling.ts    # WebSocket signaling
│   │   └── useWebRTC.ts       # Peer connection management
│   ├── utils/
│   │   └── turnCredentials.ts # Metered API integration
│   ├── types.ts               # TypeScript interfaces
│   └── App.tsx                # Main application
├── ios/                       # iOS native project
├── android/                   # Android native project
├── index.js                   # React Native entry point (registers src/App.tsx)
└── package.json
```

## TURN Server

This example uses [Metered TURN Server](https://www.metered.ca/stun-turn/) for reliable connectivity. The TURN server relays media when direct peer-to-peer connections aren't possible (e.g., behind symmetric NATs or firewalls).

## Limitations

- Mesh topology limits practical use to 3-4 participants
- No screen sharing (not supported on mobile WebRTC)
- No text chat (can be added)
- Signaling server must be running and reachable from the device
- WebRTC connections may suspend when the app goes to the background

## Troubleshooting

### iOS

- **Pod install fails**: Make sure CocoaPods is installed (`gem install cocoapods`). Then run `cd ios && bundle install && bundle exec pod install`.
- **Build fails in Xcode**: Open `ios/ReactNativeGroupVideoCall.xcworkspace` (not `.xcodeproj`) in Xcode. Ensure your Xcode version supports the iOS deployment target.
- **Signing errors on physical device**: Configure your Apple Developer team in Xcode under **Signing & Capabilities** for the `ReactNativeGroupVideoCall` target.
- **Camera not working in simulator**: The iOS simulator provides a simulated camera. For real camera testing, use a physical device.

### Android

- **Build fails with SDK errors**: Ensure `ANDROID_HOME` is set and points to your Android SDK. Check that you have the required SDK platforms and build tools installed via Android Studio's SDK Manager.
- **No video on Android emulator**: Some emulators have limited camera emulation. Try a different emulator image (e.g., one with Google Play) or use a physical device.
- **App crashes on launch**: Check that `minSdkVersion` is 24+ in `android/build.gradle`. Run `adb logcat` to see crash logs.
- **Permission denied**: On first launch, the app will request camera and microphone permissions. If denied, go to the device's **Settings > Apps > ReactNativeGroupVideoCall > Permissions** to grant them.

### General

- **Can't connect to signaling server from physical device**: Update `SIGNALING_SERVER_URL` in `src/hooks/useSignaling.ts` to your machine's LAN IP address. Ensure both devices are on the same Wi-Fi network.
- **Peers can't connect**: Verify the signaling server is running (`npm run server`). Check the Metro console for WebSocket errors. If behind a restrictive network, ensure TURN credentials are configured in `src/utils/turnCredentials.ts`.
- **Hot reload breaks connections**: WebRTC peer connections may become orphaned after a hot reload. Do a full app restart (close and reopen the app) if you experience connection issues during development.
