import 'package:flutter_webrtc/flutter_webrtc.dart';

/// Owns the renderer for a single remote peer. The service that creates the
/// peer is responsible for `dispose()` — putting the renderer in the widget's
/// initState would orphan it on peer churn.
class RemotePeer {
  final String peerId;
  final RTCVideoRenderer renderer;
  MediaStream? stream;

  RemotePeer({required this.peerId, required this.renderer, this.stream});

  Future<void> attach(MediaStream remoteStream) async {
    stream = remoteStream;
    renderer.srcObject = remoteStream;
  }

  Future<void> dispose() async {
    renderer.srcObject = null;
    await renderer.dispose();
  }
}
