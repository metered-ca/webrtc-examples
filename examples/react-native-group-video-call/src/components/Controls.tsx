import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onLeave: () => void;
}

export function Controls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onLeave,
}: ControlsProps) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={[styles.btn, !isAudioEnabled && styles.btnOff]}
        onPress={onToggleAudio}
      >
        <Text style={styles.btnText}>{isAudioEnabled ? 'Mute' : 'Unmute'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, !isVideoEnabled && styles.btnOff]}
        onPress={onToggleVideo}
      >
        <Text style={styles.btnText}>{isVideoEnabled ? 'Video Off' : 'Video On'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={onSwitchCamera}>
        <Text style={styles.btnText}>Flip</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.btnLeave]} onPress={onLeave}>
        <Text style={styles.btnText}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#1a1a2e',
    gap: 12,
  },
  btn: {
    backgroundColor: '#3a3a5e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  btnOff: {
    backgroundColor: '#e67e22',
  },
  btnLeave: {
    backgroundColor: '#e74c3c',
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
