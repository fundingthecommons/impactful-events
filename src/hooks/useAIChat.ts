'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIChatOptions {
  pathname: string;
  eventId?: string;
}

const STORAGE_KEY = 'ai-chat-messages';

export function useAIChat({ pathname, eventId }: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRestoredRef = useRef(false);

  // Restore messages from sessionStorage on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist messages to sessionStorage on change
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        console.log('[AI Chat] Fetching /api/ai/chat...');
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            pathname,
            eventId,
          }),
          signal: controller.signal,
        });

        console.log('[AI Chat] Response:', response.status, response.headers.get('content-type'));

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Could not read error body');
          throw new Error(`Chat request failed: ${String(response.status)} - ${errorBody}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let fullResponse = '';
        let readCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          readCount++;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;

          if (readCount <= 2) {
            console.log(`[AI Chat] Chunk #${String(readCount)}:`, JSON.stringify(chunk).slice(0, 200));
          }

          const currentText = fullResponse;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: currentText }
                : m
            )
          );
        }

        console.log('[AI Chat] Done:', { reads: readCount, length: fullResponse.length });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // User cancelled
        } else {
          console.error('[AI Chat] Error:', error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, pathname, eventId]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return { messages, isStreaming, sendMessage, stop, clearMessages };
}
