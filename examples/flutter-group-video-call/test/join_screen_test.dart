import 'package:flutter/material.dart';
import 'package:flutter_group_video_call/screens/join_screen.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget _wrap(Widget child) => MaterialApp(home: child);

  testWidgets('renders title, hint, and join button', (tester) async {
    await tester.pumpWidget(_wrap(JoinScreen(
      onJoin: (_) async {},
      isLoading: false,
    )));

    expect(find.text('Group Video Call'), findsOneWidget);
    expect(find.text('Enter room name'), findsOneWidget);
    expect(find.text('Join Room'), findsOneWidget);
  });

  testWidgets('does not call onJoin when room is empty', (tester) async {
    var called = false;
    await tester.pumpWidget(_wrap(JoinScreen(
      onJoin: (_) async {
        called = true;
      },
      isLoading: false,
    )));

    await tester.tap(find.text('Join Room'));
    await tester.pump();
    expect(called, isFalse);
  });

  testWidgets('calls onJoin with trimmed room name', (tester) async {
    String? captured;
    await tester.pumpWidget(_wrap(JoinScreen(
      onJoin: (room) async {
        captured = room;
      },
      isLoading: false,
    )));

    await tester.enterText(find.byType(TextField), '  team-standup  ');
    await tester.tap(find.text('Join Room'));
    await tester.pump();
    expect(captured, 'team-standup');
  });

  testWidgets('shows loading spinner and disables submit', (tester) async {
    var called = false;
    await tester.pumpWidget(_wrap(JoinScreen(
      onJoin: (_) async {
        called = true;
      },
      isLoading: true,
    )));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Join Room'), findsNothing);

    await tester.enterText(find.byType(TextField), 'r');
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();
    expect(called, isFalse);
  });

  testWidgets('shows error text when error provided', (tester) async {
    await tester.pumpWidget(_wrap(JoinScreen(
      onJoin: (_) async {},
      isLoading: false,
      error: 'Could not connect',
    )));
    expect(find.text('Could not connect'), findsOneWidget);
  });
}
