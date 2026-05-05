import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

class VideoTile extends StatelessWidget {
  final RTCVideoRenderer? renderer;
  final String label;
  final bool isLocal;
  final bool mirror;
  final bool isMuted;
  final bool hasStream;

  const VideoTile({
    super.key,
    required this.renderer,
    required this.label,
    this.isLocal = false,
    this.mirror = false,
    this.isMuted = false,
    required this.hasStream,
  });

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: 0.5,
      child: AspectRatio(
        aspectRatio: 3 / 4,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E),
            border: Border.all(color: const Color(0xFF2A2A3E)),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: hasStream && renderer != null
                    ? RTCVideoView(
                        renderer!,
                        objectFit:
                            RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                        mirror: mirror,
                      )
                    : const Center(
                        child: Text(
                          'Connecting...',
                          style: TextStyle(
                              color: Color(0xFF888888), fontSize: 14),
                        ),
                      ),
              ),
              Positioned(
                left: 8,
                bottom: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(label,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 12)),
                      if (isMuted)
                        const Padding(
                          padding: EdgeInsets.only(left: 6),
                          child: Text('Muted',
                              style: TextStyle(
                                  color: Color(0xFFFF6B6B), fontSize: 11)),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
