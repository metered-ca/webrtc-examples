import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/signaling_message.dart';

// Android emulator uses 10.0.2.2 to reach the host machine.
// iOS simulator can use localhost.
// For physical devices or Genymotion, override _signalingUrl below
// (e.g. ws://192.168.1.100:3003 or ws://10.0.3.2:3003).
String get _signalingUrl {
  if (Platform.isAndroid) return 'ws://10.0.2.2:3003';
  return 'ws://localhost:3003';
}

class SignalingService {
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _sub;
  final _messages = StreamController<SignalingMessage>.broadcast();
  final _connected = Completer<void>();

  Stream<SignalingMessage> get messages => _messages.stream;

  Future<void> connect() async {
    if (_channel != null) return;
    final ch = WebSocketChannel.connect(Uri.parse(_signalingUrl));
    await ch.ready;
    _channel = ch;
    if (!_connected.isCompleted) _connected.complete();
    _sub = ch.stream.listen(
      (event) {
        try {
          final raw = event is String ? event : utf8.decode(event as List<int>);
          final json = jsonDecode(raw) as Map<String, dynamic>;
          final msg = SignalingMessage.fromJson(json);
          if (msg != null) _messages.add(msg);
        } catch (e) {
          // ignore: avoid_print
          print('Failed to parse signaling message: $e');
        }
      },
      onError: (err) {
        // ignore: avoid_print
        print('Signaling socket error: $err');
      },
      onDone: () {
        _channel = null;
      },
    );
  }

  void send(SignalingMessage message) {
    final ch = _channel;
    if (ch == null) {
      // ignore: avoid_print
      print('Signaling not connected; dropping message ${message.type.wire}');
      return;
    }
    ch.sink.add(jsonEncode(message.toJson()));
  }

  Future<void> disconnect() async {
    await _sub?.cancel();
    _sub = null;
    await _channel?.sink.close();
    _channel = null;
  }

  Future<void> dispose() async {
    await disconnect();
    await _messages.close();
  }
}
