# Flutter Group Video Call

A group video call application for iOS and Android supporting 3–4 participants using WebRTC mesh topology, Flutter, and the [Metered TURN Server](https://www.metered.ca/stun-turn/). This is the Flutter port of the [React Native group video call](../react-native-group-video-call) example, and it speaks the same signaling protocol — a Flutter and React Native client can join the same room.

## Features

- Multi-participant video calls (3–4 users)
- Mesh topology (peer-to-peer connections)
- Mute/unmute audio
- Enable/disable video
- Switch front/back camera
- Room-based joining
- Works on iOS and Android

## Prerequisites

- Flutter 3.22+ (Dart 3.4+)
- Node.js 22+ (for the signaling server)
- Metered TURN server credentials (get them at https://www.metered.ca/stun-turn/)

### iOS Requirements

- macOS
- Xcode (latest stable recommended)
- iOS Simulator or a physical iOS device
- CocoaPods (`gem install cocoapods` or install via Homebrew)

### Android Requirements

- Android Studio with SDK installed
- Android emulator (API 23+) or a physical Android device with USB debugging enabled
- Java Development Kit (JDK 17 recommended)

## Setup

### 1. Install Flutter dependencies

```bash
cd examples/flutter-group-video-call
flutter pub get
```

### 2. Configure TURN credentials

Edit `lib/services/turn_credentials.dart` and replace with your Metered credentials:

```dart
const String meteredDomain = 'your-app.metered.live';
const String meteredApiKey = 'your-api-key';
```

If both are left empty, the app falls back to STUN-only (`stun:stun.metered.ca:80`), which is sufficient for testing on the same network.

### 3. Install signaling server dependencies

```bash
npm install
```

### 4. iOS setup

Install CocoaPods dependencies:

```bash
cd ios && pod install && cd ..
```

`flutter run -d <ios-device>` will also run `pod install` automatically on the first build.

> On Apple Silicon (M-series Macs), if you see `ffi`/architecture errors during `pod install`, try: `cd ios && arch -x86_64 pod install && cd ..`.

### 5. Android setup

No additional setup is required. The Android project is pre-configured with the correct permissions and `minSdkVersion` (23).

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

### Run on iOS

> **First time?** Make sure you've completed the [iOS setup](#4-ios-setup) step before building.

In a second terminal:

```bash
flutter run -d "iPhone 15 Pro"
```

To run on a physical iOS device, connect it via USB and select it:

```bash
flutter devices
flutter run -d <device-id>
```

> **Note:** Physical devices require a valid Apple Developer signing configuration in Xcode. Open `ios/Runner.xcworkspace` in Xcode and configure your signing team under **Signing & Capabilities**.

### Run on Android

> **First time?** Make sure you have Android Studio installed and `ANDROID_HOME` set. See the [Android setup](#5-android-setup) section.

Make sure you have an Android emulator running or a physical device connected, then in a second terminal:

```bash
flutter run -d emulator-5554
```

To check connected devices:

```bash
flutter devices
```

### Testing a video call

1. Run the app on two separate devices or simulators
2. Enter the same room name on both devices
3. Tap **Join Room** on both devices
4. You should see each other's video streams

## Connecting from Physical Devices

The signaling server URL is configured per platform in `lib/services/signaling_service.dart`:

| Platform | Default URL | Notes |
|----------|------------|-------|
| iOS simulator | `ws://localhost:3003` | Works out of the box |
| Android emulator (stock AVD) | `ws://10.0.2.2:3003` | `10.0.2.2` is Android's alias for the host machine |
| Genymotion emulator | `ws://10.0.3.2:3003` | Different host alias |
| Physical device | Must be configured manually | Replace with your machine's LAN IP |

To find your machine's LAN IP:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

Then update `_signalingUrl` in `lib/services/signaling_service.dart`:

```dart
String get _signalingUrl => 'ws://192.168.1.100:3003'; // your LAN IP
```

> **Important:** Both the device and the development machine must be on the same network.

## How It Works

### Architecture

This example uses a **mesh topology** where each participant connects directly to every other participant. This works well for small groups (3–4 people) but doesn't scale to larger groups.

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

### Differences from the React Native Version

- Uses [`flutter_webrtc`](https://pub.dev/packages/flutter_webrtc) — a native binding to libwebrtc that exposes the plain WebRTC API (`RTCPeerConnection`, `MediaStream`, `RTCVideoView`, etc.)
- Video rendering uses `RTCVideoView` with an explicitly initialized `RTCVideoRenderer` per peer
- Android requires runtime camera/microphone permission requests via `permission_handler`
- iOS audio routing is forced to the speaker via `Helper.setSpeakerphoneOn(true)` — without this iOS routes to the earpiece on iPhone

### Project Structure

```
flutter-group-video-call/
├── server/
│   └── index.ts                       # WebSocket signaling server (port 3003)
├── lib/
│   ├── main.dart                      # Entry point
│   ├── app.dart                       # JoinScreen ↔ CallScreen routing + signaling dispatch
│   ├── models/
│   │   ├── signaling_message.dart
│   │   ├── ice_server.dart
│   │   └── remote_peer.dart           # Owns the per-peer RTCVideoRenderer
│   ├── services/
│   │   ├── media_service.dart         # Camera/mic + permissions + flip + speaker
│   │   ├── signaling_service.dart     # WebSocket signaling
│   │   ├── webrtc_service.dart        # Peer connection management
│   │   └── turn_credentials.dart      # Metered API integration
│   ├── screens/
│   │   ├── join_screen.dart           # Room join form
│   │   └── call_screen.dart           # Header + grid + controls
│   └── widgets/
│       ├── video_grid.dart
│       ├── video_tile.dart
│       └── controls.dart
├── ios/                                # iOS native project
├── android/                            # Android native project
├── pubspec.yaml
├── package.json                        # signaling server scripts only
└── README.md
```

## TURN Server

This example uses [Metered TURN Server](https://www.metered.ca/stun-turn/) for reliable connectivity. The TURN server relays media when direct peer-to-peer connections aren't possible (e.g., behind symmetric NATs or firewalls).

## Limitations

- Mesh topology limits practical use to 3–4 participants
- No screen sharing
- No text chat
- Signaling server must be running and reachable from the device
- WebRTC connections may suspend when the app goes to the background — there is no foreground service or iOS background-audio mode in this example

## Troubleshooting

### iOS

- **Pod install fails on Apple Silicon**: try `cd ios && arch -x86_64 pod install && cd ..`.
- **Build fails in Xcode**: open `ios/Runner.xcworkspace` (not `.xcodeproj`) in Xcode. Ensure your Xcode version supports the iOS 13.0 deployment target.
- **Signing errors on physical device**: configure your Apple Developer team in Xcode under **Signing & Capabilities** for the `Runner` target.
- **Camera not working in simulator**: the iOS simulator provides a simulated camera. For real camera testing, use a physical device.

### Android

- **Build fails with SDK errors**: ensure `ANDROID_HOME` is set and points to your Android SDK. Check that the required SDK platforms and build tools are installed via Android Studio's SDK Manager.
- **No video on Android emulator**: some emulators have limited camera emulation. Try a different emulator image (e.g., one with Google Play) or use a physical device.
- **App crashes on launch**: check that `minSdk` is 23+ in `android/app/build.gradle`. Run `adb logcat` to see crash logs.
- **Permission denied**: on first launch the app will request camera and microphone permissions. If denied, go to the device's **Settings > Apps > flutter\_group\_video\_call > Permissions** to grant them.

### General

- **Can't connect to signaling server from physical device**: update `_signalingUrl` in `lib/services/signaling_service.dart` to your machine's LAN IP. Ensure both devices are on the same Wi-Fi network.
- **Peers can't connect**: verify the signaling server is running (`npm run server`). Watch the Flutter console for WebSocket errors. If behind a restrictive network, configure TURN credentials in `lib/services/turn_credentials.dart`.
- **Hot reload breaks calls**: native peer connections survive hot reload but Dart-side closures rebind, leaving zombie listeners. Use **hot restart** (Shift+R), not hot reload, while a call is active.
