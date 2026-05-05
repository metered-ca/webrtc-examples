import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import 'models/signaling_message.dart';
import 'screens/call_screen.dart';
import 'screens/join_screen.dart';
import 'services/media_service.dart';
import 'services/signaling_service.dart';
import 'services/webrtc_service.dart';

class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  late final String _localPeerId = _generatePeerId();
  late final MediaService _media = MediaService();
  late final SignalingService _signaling = SignalingService();
  late final WebRTCService _webrtc = WebRTCService(
    media: _media,
    signaling: _signaling,
    localPeerId: _localPeerId,
  );

  StreamSubscription<SignalingMessage>? _signalingSub;
  bool _joined = false;
  bool _loading = false;
  String? _roomId;
  String? _error;

  String _generatePeerId() {
    final rand = Random.secure();
    final bytes = List<int>.generate(8, (_) => rand.nextInt(36));
    return bytes
        .map((b) => '0123456789abcdefghijklmnopqrstuvwxyz'[b])
        .join();
  }

  Future<void> _join(String roomId) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _media.start();
      await _webrtc.initializeIceServers();

      _signalingSub ??= _signaling.messages.listen(_handleSignaling);
      await _signaling.connect();

      _signaling.send(SignalingMessage(
        type: SignalingType.join,
        roomId: roomId,
        peerId: _localPeerId,
      ));

      setState(() {
        _joined = true;
        _roomId = roomId;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _leave() async {
    await _webrtc.closeAll();
    await _signaling.disconnect();
    await _signalingSub?.cancel();
    _signalingSub = null;
    await _media.stop();
    setState(() {
      _joined = false;
      _roomId = null;
    });
  }

  Future<void> _handleSignaling(SignalingMessage msg) async {
    switch (msg.type) {
      case SignalingType.roomPeers:
        for (final id in msg.peers ?? const <String>[]) {
          await _webrtc.createOutgoingConnection(id);
        }
        break;
      case SignalingType.peerJoined:
        // Existing peer (us) waits for the new peer's offer.
        break;
      case SignalingType.peerLeft:
        if (msg.peerId != null) await _webrtc.removePeer(msg.peerId!);
        break;
      case SignalingType.offer:
        if (msg.from != null && msg.sdp != null) {
          await _webrtc.handleOffer(msg.from!, msg.sdp!);
        }
        break;
      case SignalingType.answer:
        if (msg.from != null && msg.sdp != null) {
          await _webrtc.handleAnswer(msg.from!, msg.sdp!);
        }
        break;
      case SignalingType.iceCandidate:
        if (msg.from != null && msg.candidate != null) {
          await _webrtc.handleIceCandidate(msg.from!, msg.candidate!);
        }
        break;
      case SignalingType.join:
        break;
    }
  }

  @override
  void dispose() {
    _signalingSub?.cancel();
    _signaling.dispose();
    _webrtc.dispose();
    _media.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Group Video Call',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F0F23),
      ),
      home: _joined && _roomId != null
          ? CallScreen(
              roomId: _roomId!,
              localPeerId: _localPeerId,
              media: _media,
              webrtc: _webrtc,
              onLeave: _leave,
            )
          : JoinScreen(
              onJoin: _join,
              isLoading: _loading,
              error: _error,
            ),
    );
  }
}
