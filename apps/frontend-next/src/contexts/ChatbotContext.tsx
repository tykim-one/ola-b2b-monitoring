'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import apiClient from '@/lib/api-client';
import type {
  ChatbotMessage,
  ChatbotResponse,
} from '@ola/shared-types';

interface ChatbotContextType {
  isOpen: boolean;
  messages: ChatbotMessage[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  currentPage: string | null;
  toggleChatbot: () => void;
  openChatbot: () => void;
  closeChatbot: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

interface ChatbotProviderProps {
  children: ReactNode;
}

export function ChatbotProvider({ children }: ChatbotProviderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChatbot = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openChatbot = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChatbot = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<ChatbotResponse>(
          '/api/chatbot/chat',
          {
            message: content,
            pageContext: pathname,
            sessionId: sessionId,
          }
        );

        const { sessionId: newSessionId, userMessage, assistantMessage } =
          response.data;

        // Update session ID if new
        if (!sessionId) {
          setSessionId(newSessionId);
        }

        // Add messages to state
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
      } catch (err: any) {
        console.error('Chatbot error:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to send message'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [pathname, sessionId]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  const value: ChatbotContextType = useMemo(() => ({
    isOpen,
    messages,
    sessionId,
    isLoading,
    error,
    currentPage: pathname,
    toggleChatbot,
    openChatbot,
    closeChatbot,
    sendMessage,
    clearChat,
  }), [isOpen, messages, sessionId, isLoading, error, pathname, toggleChatbot, openChatbot, closeChatbot, sendMessage, clearChat]);

  return (
    <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}
