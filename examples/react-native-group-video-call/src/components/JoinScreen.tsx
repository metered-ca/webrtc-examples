import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface JoinScreenProps {
  onJoin: (roomId: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function JoinScreen({ onJoin, isLoading, error }: JoinScreenProps) {
  const [roomId, setRoomId] = useState('');

  const handleJoin = () => {
    if (roomId.trim()) {
      onJoin(roomId.trim());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Group Video Call</Text>
        <Text style={styles.subtitle}>Enter a room name to join or create a video call</Text>

        <TextInput
          style={styles.input}
          value={roomId}
          onChangeText={setRoomId}
          placeholder="Enter room name"
          placeholderTextColor="#888"
          editable={!isLoading}
          autoFocus
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={handleJoin}
        />

        <TouchableOpacity
          style={[styles.button, (isLoading || !roomId.trim()) && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={isLoading || !roomId.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Join Room</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  button: {
    width: '100%',
    backgroundColor: '#4a6cf7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#e74c3c',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
