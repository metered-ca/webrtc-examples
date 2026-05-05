import 'package:flutter_group_video_call/models/ice_server.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('IceServer', () {
    test('STUN-only entry omits username and credential in toMap', () {
      final stun = const IceServer(urls: 'stun:stun.metered.ca:80').toMap();
      expect(stun, {'urls': 'stun:stun.metered.ca:80'});
      expect(stun.containsKey('username'), isFalse);
      expect(stun.containsKey('credential'), isFalse);
    });

    test('TURN entry preserves credentials', () {
      final turn = const IceServer(
        urls: 'turn:turn.metered.ca:443?transport=tcp',
        username: 'user',
        credential: 'pass',
      ).toMap();
      expect(turn, {
        'urls': 'turn:turn.metered.ca:443?transport=tcp',
        'username': 'user',
        'credential': 'pass',
      });
    });

    test('fromJson parses Metered API response shape', () {
      // Shape per METERED_DOCS.md
      final raw = {
        'urls': 'turn:turn.metered.ca:80',
        'username': 'abc',
        'credential': 'def',
      };
      final ice = IceServer.fromJson(raw);
      expect(ice.urls, 'turn:turn.metered.ca:80');
      expect(ice.username, 'abc');
      expect(ice.credential, 'def');
    });
  });
}
