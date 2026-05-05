import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart';

class MediaService extends ChangeNotifier {
  MediaStream? _localStream;
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _frontCamera = true;
  String? _error;

  MediaStream? get localStream => _localStream;
  RTCVideoRenderer get localRenderer => _localRenderer;
  bool get isAudioEnabled => _audioEnabled;
  bool get isVideoEnabled => _videoEnabled;
  bool get isFrontCamera => _frontCamera;
  String? get error => _error;

  Future<void> _ensurePermissions() async {
    if (!Platform.isAndroid) return;
    final results = await [Permission.camera, Permission.microphone].request();
    final cam = results[Permission.camera];
    final mic = results[Permission.microphone];
    if (cam != PermissionStatus.granted || mic != PermissionStatus.granted) {
      throw StateError('Camera and microphone permissions are required');
    }
  }

  Future<void> start() async {
    try {
      _error = null;
      await _ensurePermissions();
      await _localRenderer.initialize();

      final stream = await navigator.mediaDevices.getUserMedia(<String, dynamic>{
        'audio': true,
        'video': {'facingMode': 'user'},
      });

      _localStream = stream;
      _localRenderer.srcObject = stream;
      _audioEnabled = true;
      _videoEnabled = true;
      _frontCamera = true;

      // Without this iOS routes audio to the earpiece by default.
      await Helper.setSpeakerphoneOn(true);

      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  void toggleAudio() {
    final track = _localStream?.getAudioTracks().firstOrNull;
    if (track == null) return;
    track.enabled = !track.enabled;
    _audioEnabled = track.enabled;
    notifyListeners();
  }

  void toggleVideo() {
    final track = _localStream?.getVideoTracks().firstOrNull;
    if (track == null) return;
    track.enabled = !track.enabled;
    _videoEnabled = track.enabled;
    notifyListeners();
  }

  Future<void> switchCamera() async {
    final track = _localStream?.getVideoTracks().firstOrNull;
    if (track == null) return;
    final result = await Helper.switchCamera(track);
    _frontCamera = result;
    notifyListeners();
  }

  Future<void> stop() async {
    final tracks = _localStream?.getTracks() ?? const [];
    for (final t in tracks) {
      await t.stop();
    }
    await _localStream?.dispose();
    _localStream = null;
    _localRenderer.srcObject = null;
    notifyListeners();
  }

  @override
  void dispose() {
    stop();
    _localRenderer.dispose();
    super.dispose();
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
