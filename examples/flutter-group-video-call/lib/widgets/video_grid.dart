import 'package:flutter/material.dart';

import '../models/remote_peer.dart';
import '../services/media_service.dart';
import '../services/webrtc_service.dart';
import 'video_tile.dart';

class VideoGrid extends StatelessWidget {
  final MediaService media;
  final WebRTCService webrtc;
  final String localPeerId;

  const VideoGrid({
    super.key,
    required this.media,
    required this.webrtc,
    required this.localPeerId,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0F0F23),
      child: ValueListenableBuilder<List<RemotePeer>>(
        valueListenable: webrtc.remotePeers,
        builder: (context, remotes, _) {
          return ListenableBuilder(
            listenable: media,
            builder: (context, _) {
              return Wrap(
                children: [
                  VideoTile(
                    renderer: media.localRenderer,
                    label: 'You',
                    isLocal: true,
                    mirror: media.isFrontCamera,
                    isMuted: !media.isAudioEnabled,
                    hasStream: media.localStream != null,
                  ),
                  for (final peer in remotes)
                    VideoTile(
                      renderer: peer.renderer,
                      label: 'Peer ${peer.peerId.substring(0, peer.peerId.length.clamp(0, 6))}',
                      hasStream: peer.stream != null,
                    ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}
