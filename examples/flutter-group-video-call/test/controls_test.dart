import 'package:flutter/material.dart';
import 'package:flutter_group_video_call/widgets/controls.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('shows Mute when audio enabled and Unmute when not', (tester) async {
    await tester.pumpWidget(_wrap(Controls(
      isAudioEnabled: true,
      isVideoEnabled: true,
      onToggleAudio: () {},
      onToggleVideo: () {},
      onSwitchCamera: () {},
      onLeave: () {},
    )));
    expect(find.text('Mute'), findsOneWidget);
    expect(find.text('Unmute'), findsNothing);

    await tester.pumpWidget(_wrap(Controls(
      isAudioEnabled: false,
      isVideoEnabled: true,
      onToggleAudio: () {},
      onToggleVideo: () {},
      onSwitchCamera: () {},
      onLeave: () {},
    )));
    expect(find.text('Unmute'), findsOneWidget);
  });

  testWidgets('button taps invoke the right callbacks', (tester) async {
    var audio = 0, video = 0, flip = 0, leave = 0;
    await tester.pumpWidget(_wrap(Controls(
      isAudioEnabled: true,
      isVideoEnabled: true,
      onToggleAudio: () => audio++,
      onToggleVideo: () => video++,
      onSwitchCamera: () => flip++,
      onLeave: () => leave++,
    )));

    await tester.tap(find.text('Mute'));
    await tester.tap(find.text('Video Off'));
    await tester.tap(find.text('Flip'));
    await tester.tap(find.text('Leave'));
    await tester.pump();

    expect(audio, 1);
    expect(video, 1);
    expect(flip, 1);
    expect(leave, 1);
  });
}
