import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../models/ice_server.dart';
import '../models/remote_peer.dart';
import '../models/signaling_message.dart';
import 'media_service.dart';
import 'signaling_service.dart';
import 'turn_credentials.dart';

class WebRTCService extends ChangeNotifier {
  final MediaService media;
  final SignalingService signaling;
  final String localPeerId;

  WebRTCService({
    required this.media,
    required this.signaling,
    required this.localPeerId,
  });

  final Map<String, RTCPeerConnection> _peers = {};
  final Map<String, List<Map<String, dynamic>>> _pendingCandidates = {};
  final ValueNotifier<List<RemotePeer>> remotePeers =
      ValueNotifier(<RemotePeer>[]);

  List<IceServer> _iceServers = const [meteredStunFallback];

  Future<void> initializeIceServers() async {
    try {
      _iceServers = await fetchIceServers();
    } catch (err) {
      // ignore: avoid_print
      print('TURN credential fetch failed, using STUN-only fallback: $err');
      _iceServers = const [meteredStunFallback];
    }
  }

  Map<String, dynamic> get _config => {
        'iceServers': _iceServers.map((s) => s.toMap()).toList(),
        'sdpSemantics': 'unified-plan',
      };

  Future<RTCPeerConnection> _ensurePeer(String remotePeerId) async {
    final existing = _peers[remotePeerId];
    if (existing != null) return existing;

    final pc = await createPeerConnection(_config);
    _peers[remotePeerId] = pc;
    _addOrUpdateRemotePeer(remotePeerId);

    final localStream = media.localStream;
    if (localStream != null) {
      for (final track in localStream.getTracks()) {
        await pc.addTrack(track, localStream);
      }
    }

    pc.onTrack = (event) async {
      if (event.streams.isEmpty) return;
      final stream = event.streams.first;
      final peer = _findPeer(remotePeerId);
      if (peer != null) {
        await peer.attach(stream);
        _bumpRemotePeers();
      }
    };

    pc.onIceCandidate = (candidate) {
      if (candidate.candidate == null) return;
      signaling.send(SignalingMessage(
        type: SignalingType.iceCandidate,
        from: localPeerId,
        to: remotePeerId,
        candidate: candidate.toMap().cast<String, dynamic>(),
      ));
    };

    pc.onConnectionState = (state) {
      // ignore: avoid_print
      print('Connection state with $remotePeerId: $state');
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
        // ignore: avoid_print
        print('Connection failed with $remotePeerId; restarting ICE');
        pc.restartIce();
      }
    };

    pc.onIceConnectionState = (state) {
      if (state == RTCIceConnectionState.RTCIceConnectionStateFailed) {
        // ignore: avoid_print
        print('ICE failed with $remotePeerId; restarting ICE');
        pc.restartIce();
      }
    };

    return pc;
  }

  Future<void> createOutgoingConnection(String remotePeerId) async {
    final pc = await _ensurePeer(remotePeerId);
    final offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signaling.send(SignalingMessage(
      type: SignalingType.offer,
      from: localPeerId,
      to: remotePeerId,
      sdp: {'sdp': offer.sdp, 'type': offer.type},
    ));
  }

  Future<void> handleOffer(
      String remotePeerId, Map<String, dynamic> sdpMap) async {
    final pc = await _ensurePeer(remotePeerId);
    await pc.setRemoteDescription(
      RTCSessionDescription(sdpMap['sdp'] as String?, sdpMap['type'] as String?),
    );
    await _flushPendingCandidates(remotePeerId, pc);

    final answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signaling.send(SignalingMessage(
      type: SignalingType.answer,
      from: localPeerId,
      to: remotePeerId,
      sdp: {'sdp': answer.sdp, 'type': answer.type},
    ));
  }

  Future<void> handleAnswer(
      String remotePeerId, Map<String, dynamic> sdpMap) async {
    final pc = _peers[remotePeerId];
    if (pc == null) return;
    await pc.setRemoteDescription(
      RTCSessionDescription(sdpMap['sdp'] as String?, sdpMap['type'] as String?),
    );
    await _flushPendingCandidates(remotePeerId, pc);
  }

  Future<void> handleIceCandidate(
      String remotePeerId, Map<String, dynamic> candidateMap) async {
    final pc = _peers[remotePeerId];
    final ice = RTCIceCandidate(
      candidateMap['candidate'] as String?,
      candidateMap['sdpMid'] as String?,
      (candidateMap['sdpMLineIndex'] as num?)?.toInt(),
    );
    if (pc != null && (await pc.getRemoteDescription()) != null) {
      await pc.addCandidate(ice);
    } else {
      // Buffer candidates that arrive before remote description is set.
      // Mirrors useWebRTC.ts:170-183 in the React Native example.
      _pendingCandidates.putIfAbsent(remotePeerId, () => []).add(candidateMap);
    }
  }

  Future<void> _flushPendingCandidates(
      String remotePeerId, RTCPeerConnection pc) async {
    final pending = _pendingCandidates.remove(remotePeerId);
    if (pending == null) return;
    for (final c in pending) {
      await pc.addCandidate(RTCIceCandidate(
        c['candidate'] as String?,
        c['sdpMid'] as String?,
        (c['sdpMLineIndex'] as num?)?.toInt(),
      ));
    }
  }

  Future<void> removePeer(String remotePeerId) async {
    final pc = _peers.remove(remotePeerId);
    await pc?.close();
    _pendingCandidates.remove(remotePeerId);
    final list = List<RemotePeer>.from(remotePeers.value);
    final idx = list.indexWhere((p) => p.peerId == remotePeerId);
    if (idx != -1) {
      final removed = list.removeAt(idx);
      await removed.dispose();
      remotePeers.value = list;
    }
  }

  Future<void> closeAll() async {
    for (final entry in _peers.entries) {
      await entry.value.close();
    }
    _peers.clear();
    _pendingCandidates.clear();
    final current = remotePeers.value;
    remotePeers.value = const [];
    for (final p in current) {
      await p.dispose();
    }
  }

  RemotePeer? _findPeer(String peerId) {
    for (final p in remotePeers.value) {
      if (p.peerId == peerId) return p;
    }
    return null;
  }

  Future<void> _addOrUpdateRemotePeer(String peerId) async {
    if (_findPeer(peerId) != null) return;
    final renderer = RTCVideoRenderer();
    await renderer.initialize();
    final list = List<RemotePeer>.from(remotePeers.value)
      ..add(RemotePeer(peerId: peerId, renderer: renderer));
    remotePeers.value = list;
  }

  void _bumpRemotePeers() {
    // Force ValueNotifier listeners to rebuild after stream attach.
    remotePeers.value = List<RemotePeer>.from(remotePeers.value);
  }

  @override
  void dispose() {
    closeAll();
    remotePeers.dispose();
    super.dispose();
  }
}
