import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/ice_server.dart';

// Configure these values with your Metered credentials.
// Get them at https://www.metered.ca/stun-turn/
const String meteredDomain = '';
const String meteredApiKey = '';

const IceServer meteredStunFallback =
    IceServer(urls: 'stun:stun.metered.ca:80');

Future<List<IceServer>> fetchIceServers() async {
  if (meteredDomain.isEmpty || meteredApiKey.isEmpty) {
    throw StateError('METERED_DOMAIN / METERED_API_KEY are not configured');
  }
  final uri = Uri.parse(
    'https://$meteredDomain/api/v1/turn/credentials?apiKey=$meteredApiKey',
  );
  final res = await http.get(uri);
  if (res.statusCode != 200) {
    throw HttpException(
      'TURN credential fetch failed (${res.statusCode}): ${res.body}',
    );
  }
  final body = jsonDecode(res.body) as List<dynamic>;
  return body
      .map((e) => IceServer.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

class HttpException implements Exception {
  final String message;
  HttpException(this.message);
  @override
  String toString() => message;
}
