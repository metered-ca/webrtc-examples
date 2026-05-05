import 'package:flutter/material.dart';

class Controls extends StatelessWidget {
  final bool isAudioEnabled;
  final bool isVideoEnabled;
  final VoidCallback onToggleAudio;
  final VoidCallback onToggleVideo;
  final VoidCallback onSwitchCamera;
  final VoidCallback onLeave;

  const Controls({
    super.key,
    required this.isAudioEnabled,
    required this.isVideoEnabled,
    required this.onToggleAudio,
    required this.onToggleVideo,
    required this.onSwitchCamera,
    required this.onLeave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      color: const Color(0xFF1A1A2E),
      child: Row(
        children: [
          Expanded(
            child: _Btn(
              label: isAudioEnabled ? 'Mute' : 'Unmute',
              onPressed: onToggleAudio,
              background: isAudioEnabled
                  ? const Color(0xFF3A3A5E)
                  : const Color(0xFFE67E22),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _Btn(
              label: isVideoEnabled ? 'Video Off' : 'Video On',
              onPressed: onToggleVideo,
              background: isVideoEnabled
                  ? const Color(0xFF3A3A5E)
                  : const Color(0xFFE67E22),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _Btn(
              label: 'Flip',
              onPressed: onSwitchCamera,
              background: const Color(0xFF3A3A5E),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _Btn(
              label: 'Leave',
              onPressed: onLeave,
              background: const Color(0xFFE74C3C),
            ),
          ),
        ],
      ),
    );
  }
}

class _Btn extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final Color background;
  const _Btn({
    required this.label,
    required this.onPressed,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: background,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 44),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(label,
            style:
                const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
