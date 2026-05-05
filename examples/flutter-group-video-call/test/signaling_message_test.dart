import 'package:flutter_group_video_call/models/signaling_message.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SignalingType wire format', () {
    test('matches the protocol wire strings exactly', () {
      // The signaling server (server/index.ts) and the React Native client
      // both use these literal strings. A change here would silently break
      // cross-client interoperability, so we pin them.
      expect(SignalingType.join.wire, 'join');
      expect(SignalingType.peerJoined.wire, 'peer-joined');
      expect(SignalingType.peerLeft.wire, 'peer-left');
      expect(SignalingType.roomPeers.wire, 'room-peers');
      expect(SignalingType.offer.wire, 'offer');
      expect(SignalingType.answer.wire, 'answer');
      expect(SignalingType.iceCandidate.wire, 'ice-candidate');
    });

    test('fromWire round-trips every type', () {
      for (final t in SignalingType.values) {
        expect(SignalingType.fromWire(t.wire), t);
      }
    });

    test('fromWire returns null for unknown', () {
      expect(SignalingType.fromWire('garbage'), isNull);
      expect(SignalingType.fromWire(''), isNull);
    });
  });

  group('SignalingMessage JSON round-trip', () {
    test('join message serializes only set fields', () {
      final msg = SignalingMessage(
        type: SignalingType.join,
        roomId: 'room1',
        peerId: 'abc123',
      );
      final json = msg.toJson();
      expect(json, {
        'type': 'join',
        'peerId': 'abc123',
        'roomId': 'room1',
      });
    });

    test('offer message survives round-trip', () {
      final original = SignalingMessage(
        type: SignalingType.offer,
        from: 'peerA',
        to: 'peerB',
        sdp: {'sdp': 'v=0...', 'type': 'offer'},
      );
      final round = SignalingMessage.fromJson(original.toJson());
      expect(round, isNotNull);
      expect(round!.type, SignalingType.offer);
      expect(round.from, 'peerA');
      expect(round.to, 'peerB');
      expect(round.sdp, {'sdp': 'v=0...', 'type': 'offer'});
    });

    test('ice-candidate message survives round-trip', () {
      final original = SignalingMessage(
        type: SignalingType.iceCandidate,
        from: 'peerA',
        to: 'peerB',
        candidate: {
          'candidate': 'candidate:1 1 udp ...',
          'sdpMid': '0',
          'sdpMLineIndex': 0,
        },
      );
      final round = SignalingMessage.fromJson(original.toJson());
      expect(round!.candidate, {
        'candidate': 'candidate:1 1 udp ...',
        'sdpMid': '0',
        'sdpMLineIndex': 0,
      });
    });

    test('room-peers message preserves peer list', () {
      final msg = SignalingMessage.fromJson({
        'type': 'room-peers',
        'peers': ['p1', 'p2', 'p3'],
      });
      expect(msg, isNotNull);
      expect(msg!.type, SignalingType.roomPeers);
      expect(msg.peers, ['p1', 'p2', 'p3']);
    });

    test('returns null for malformed payload', () {
      expect(SignalingMessage.fromJson({'type': 'unknown'}), isNull);
      expect(SignalingMessage.fromJson({}), isNull);
    });
  });
}
