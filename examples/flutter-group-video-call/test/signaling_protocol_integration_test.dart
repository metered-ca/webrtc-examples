@TestOn('vm')
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_group_video_call/models/signaling_message.dart';
import 'package:flutter_group_video_call/services/signaling_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// Boots the real Node signaling server (server/index.ts) and verifies the
/// Dart SignalingService speaks the protocol correctly: two clients join the
/// same room, the second receives a `room-peers` containing the first, and a
/// relayed `ice-candidate` reaches its target peer with `from` populated.
///
/// Skipped automatically if Node 22+ is not installed.
void main() {
  Process? server;
  late int port;

  setUpAll(() async {
    final hasNode = await _hasNode();
    if (!hasNode) {
      // ignore: avoid_print
      print('Skipping: node is not on PATH');
      return;
    }
    port = 3003; // matches the README and signaling_service.dart
    server = await Process.start(
      'npx',
      ['tsx', 'server/index.ts'],
      workingDirectory:
          '${Directory.current.path}', // test runs from package root
      mode: ProcessStartMode.normal,
    );
    final ready = Completer<void>();
    server!.stdout.transform(utf8.decoder).listen((line) {
      if (line.contains('Signaling server running') && !ready.isCompleted) {
        ready.complete();
      }
    });
    server!.stderr.transform(utf8.decoder).listen((line) {
      // ignore: avoid_print
      print('[server stderr] $line');
    });
    await ready.future.timeout(const Duration(seconds: 30));
  });

  tearDownAll(() async {
    server?.kill(ProcessSignal.sigterm);
    await server?.exitCode.timeout(const Duration(seconds: 5),
        onTimeout: () => -1);
  });

  test(
    'two clients exchange room-peers and forwarded ice-candidate',
    () async {
      if (server == null) return; // skipped (no node)
      final clientA = SignalingService();
      final clientB = SignalingService();

      addTearDown(() async {
        await clientA.dispose();
        await clientB.dispose();
      });

      await clientA.connect();
      await clientB.connect();

      // Client A joins the room first; should receive an empty peer list.
      final aRoomPeers = clientA.messages
          .firstWhere((m) => m.type == SignalingType.roomPeers)
          .timeout(const Duration(seconds: 5));
      clientA.send(SignalingMessage(
        type: SignalingType.join,
        roomId: 'protocol-test',
        peerId: 'peerA',
      ));
      final aMsg = await aRoomPeers;
      expect(aMsg.peers, isEmpty);

      // Client B joins; should see peerA in its room-peers.
      final bRoomPeers = clientB.messages
          .firstWhere((m) => m.type == SignalingType.roomPeers)
          .timeout(const Duration(seconds: 5));
      // Client A should be told about the new peer.
      final aPeerJoined = clientA.messages
          .firstWhere((m) => m.type == SignalingType.peerJoined)
          .timeout(const Duration(seconds: 5));
      clientB.send(SignalingMessage(
        type: SignalingType.join,
        roomId: 'protocol-test',
        peerId: 'peerB',
      ));
      final bMsg = await bRoomPeers;
      expect(bMsg.peers, ['peerA']);
      final aJoined = await aPeerJoined;
      expect(aJoined.peerId, 'peerB');

      // B forwards an ice-candidate to A; A should receive it with `from=peerB`.
      final aCandidate = clientA.messages
          .firstWhere((m) => m.type == SignalingType.iceCandidate)
          .timeout(const Duration(seconds: 5));
      clientB.send(SignalingMessage(
        type: SignalingType.iceCandidate,
        from: 'peerB',
        to: 'peerA',
        candidate: {
          'candidate': 'candidate:1 1 udp 2122 192.168.1.1 9 typ host',
          'sdpMid': '0',
          'sdpMLineIndex': 0,
        },
      ));
      final candidate = await aCandidate;
      expect(candidate.from, 'peerB');
      expect(candidate.candidate?['sdpMid'], '0');

      // When B disconnects, A should see peer-left for peerB.
      final aPeerLeft = clientA.messages
          .firstWhere((m) => m.type == SignalingType.peerLeft)
          .timeout(const Duration(seconds: 5));
      await clientB.disconnect();
      final left = await aPeerLeft;
      expect(left.peerId, 'peerB');
    },
    timeout: const Timeout(Duration(seconds: 60)),
  );
}

Future<bool> _hasNode() async {
  try {
    final r = await Process.run('node', ['--version']);
    return r.exitCode == 0;
  } catch (_) {
    return false;
  }
}
