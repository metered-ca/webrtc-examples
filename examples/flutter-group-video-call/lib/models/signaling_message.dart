enum SignalingType {
  join,
  peerJoined,
  peerLeft,
  roomPeers,
  offer,
  answer,
  iceCandidate;

  String get wire {
    switch (this) {
      case SignalingType.join:
        return 'join';
      case SignalingType.peerJoined:
        return 'peer-joined';
      case SignalingType.peerLeft:
        return 'peer-left';
      case SignalingType.roomPeers:
        return 'room-peers';
      case SignalingType.offer:
        return 'offer';
      case SignalingType.answer:
        return 'answer';
      case SignalingType.iceCandidate:
        return 'ice-candidate';
    }
  }

  static SignalingType? fromWire(String value) {
    for (final t in SignalingType.values) {
      if (t.wire == value) return t;
    }
    return null;
  }
}

class SignalingMessage {
  final SignalingType type;
  final String? peerId;
  final String? roomId;
  final String? from;
  final String? to;
  final Map<String, dynamic>? sdp;
  final Map<String, dynamic>? candidate;
  final List<String>? peers;

  SignalingMessage({
    required this.type,
    this.peerId,
    this.roomId,
    this.from,
    this.to,
    this.sdp,
    this.candidate,
    this.peers,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'type': type.wire};
    if (peerId != null) map['peerId'] = peerId;
    if (roomId != null) map['roomId'] = roomId;
    if (from != null) map['from'] = from;
    if (to != null) map['to'] = to;
    if (sdp != null) map['sdp'] = sdp;
    if (candidate != null) map['candidate'] = candidate;
    if (peers != null) map['peers'] = peers;
    return map;
  }

  static SignalingMessage? fromJson(Map<String, dynamic> json) {
    final type = SignalingType.fromWire(json['type'] as String? ?? '');
    if (type == null) return null;
    return SignalingMessage(
      type: type,
      peerId: json['peerId'] as String?,
      roomId: json['roomId'] as String?,
      from: json['from'] as String?,
      to: json['to'] as String?,
      sdp: (json['sdp'] as Map?)?.cast<String, dynamic>(),
      candidate: (json['candidate'] as Map?)?.cast<String, dynamic>(),
      peers: (json['peers'] as List?)?.cast<String>(),
    );
  }
}
