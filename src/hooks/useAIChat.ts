'use client';

import { useState, useCallback, useRef } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIChatOptions {
  pathname: string;
  eventId?: string;
}

export function useAIChat({ pathname, eventId }: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse AI SDK data stream format: lines prefixed with "0:" followed by JSON string
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const text = JSON.parse(line.slice(2)) as string;
                accumulated += text;
                const currentText = accumulated;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: currentText }
                      : m
                  )
                );
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // User cancelled — keep partial response
        } else {
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
  }, []);

  return { messages, isStreaming, sendMessage, stop, clearMessages };
}
