import 'package:flutter/material.dart';

import '../services/media_service.dart';
import '../services/webrtc_service.dart';
import '../widgets/controls.dart';
import '../widgets/video_grid.dart';

class CallScreen extends StatelessWidget {
  final String roomId;
  final String localPeerId;
  final MediaService media;
  final WebRTCService webrtc;
  final VoidCallback onLeave;

  const CallScreen({
    super.key,
    required this.roomId,
    required this.localPeerId,
    required this.media,
    required this.webrtc,
    required this.onLeave,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F23),
      body: SafeArea(
        child: Column(
          children: [
            ValueListenableBuilder(
              valueListenable: webrtc.remotePeers,
              builder: (context, peers, _) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF1A1A2E),
                    border: Border(
                      bottom: BorderSide(color: Color(0xFF2A2A3E)),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Room: $roomId',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600)),
                      Text('${1 + peers.length} participant(s)',
                          style: const TextStyle(
                              color: Color(0xFF888888), fontSize: 14)),
                    ],
                  ),
                );
              },
            ),
            Expanded(
              child: VideoGrid(
                media: media,
                webrtc: webrtc,
                localPeerId: localPeerId,
              ),
            ),
            ListenableBuilder(
              listenable: media,
              builder: (context, _) => Controls(
                isAudioEnabled: media.isAudioEnabled,
                isVideoEnabled: media.isVideoEnabled,
                onToggleAudio: media.toggleAudio,
                onToggleVideo: media.toggleVideo,
                onSwitchCamera: media.switchCamera,
                onLeave: onLeave,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
