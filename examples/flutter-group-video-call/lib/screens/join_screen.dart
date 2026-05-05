import 'package:flutter/material.dart';

class JoinScreen extends StatefulWidget {
  final Future<void> Function(String roomId) onJoin;
  final bool isLoading;
  final String? error;

  const JoinScreen({
    super.key,
    required this.onJoin,
    required this.isLoading,
    this.error,
  });

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final value = _controller.text.trim();
    if (value.isEmpty || widget.isLoading) return;
    await widget.onJoin(value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F23),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Group Video Call',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Enter a room name to join or create a video call',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF888888), fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _controller,
                    autofocus: true,
                    enabled: !widget.isLoading,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _submit(),
                    style: const TextStyle(color: Colors.white, fontSize: 16),
                    decoration: InputDecoration(
                      hintText: 'Enter room name',
                      hintStyle: const TextStyle(color: Color(0xFF888888)),
                      filled: true,
                      fillColor: const Color(0xFF2A2A3E),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF3A3A5E)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF3A3A5E)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF4A6CF7)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: widget.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4A6CF7),
                        disabledBackgroundColor:
                            const Color(0xFF4A6CF7).withOpacity(0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: widget.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Text(
                              'Join Room',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  if (widget.error != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      widget.error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFFE74C3C),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
