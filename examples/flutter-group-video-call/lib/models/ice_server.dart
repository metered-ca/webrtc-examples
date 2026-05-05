class IceServer {
  final String urls;
  final String? username;
  final String? credential;

  const IceServer({required this.urls, this.username, this.credential});

  Map<String, dynamic> toMap() {
    final map = <String, dynamic>{'urls': urls};
    if (username != null) map['username'] = username;
    if (credential != null) map['credential'] = credential;
    return map;
  }

  static IceServer fromJson(Map<String, dynamic> json) => IceServer(
        urls: json['urls'] as String,
        username: json['username'] as String?,
        credential: json['credential'] as String?,
      );
}
