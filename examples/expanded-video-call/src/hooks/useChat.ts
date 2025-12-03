import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types';

interface UseChatReturn {
  messages: ChatMessage[];
  unreadCount: number;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  markAsRead: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    messages,
    unreadCount,
    addMessage,
    clearMessages,
    markAsRead,
  };
}
