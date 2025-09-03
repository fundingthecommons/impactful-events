'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Text, Code, Title, List, Blockquote, Divider, Anchor, Paper } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Preprocess content to handle HTML elements like <aside>
  const preprocessedContent = content
    // Convert <aside> tags to blockquotes with special marker
    .replace(/<aside>\s*\n/g, '\n> **💡 Note**\n> \n> ')
    .replace(/\n\s*<\/aside>/g, '\n\n')
    // Handle nested content in aside tags
    .replace(/<aside>([^<]*)<\/aside>/g, '\n> **💡 Note**\n> \n> $1\n\n');

  return (
    <div style={{ lineHeight: 1.6, fontSize: '16px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Headers
          h1: ({ children }) => (
            <Title order={1} mb="lg" mt="xl">
              {children}
            </Title>
          ),
          h2: ({ children }) => (
            <Title order={2} mb="md" mt="xl">
              {children}
            </Title>
          ),
          h3: ({ children }) => (
            <Title order={3} mb="md" mt="lg">
              {children}
            </Title>
          ),
          h4: ({ children }) => (
            <Title order={4} mb="sm" mt="md">
              {children}
            </Title>
          ),
          h5: ({ children }) => (
            <Title order={5} mb="sm" mt="md">
              {children}
            </Title>
          ),
          h6: ({ children }) => (
            <Title order={6} mb="sm" mt="md">
              {children}
            </Title>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <Text mb="md" size="md" style={{ lineHeight: 1.7 }}>
              {children}
            </Text>
          ),
          
          // Links
          a: ({ href, children }) => (
            <Anchor
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {children}
              <IconExternalLink size={14} />
            </Anchor>
          ),
          
          // Code blocks
          pre: ({ children }) => (
            <Code
              block
              mb="md"
              p="md"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '14px',
                lineHeight: 1.4,
                background: 'var(--mantine-color-gray-0)',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              {children}
            </Code>
          ),
          
          // Inline code
          code: ({ children, className }) => {
            // If it has a className, it's a code block (handled by pre)
            if (className) {
              return <>{children}</>;
            }
            // Otherwise it's inline code
            return <Code>{children}</Code>;
          },
          
          // Lists
          ul: ({ children }) => (
            <List mb="md" spacing="sm">
              {children}
            </List>
          ),
          ol: ({ children }) => (
            <List mb="md" spacing="sm" type="ordered">
              {children}
            </List>
          ),
          li: ({ children }) => (
            <List.Item style={{ marginBottom: '4px' }}>
              {children}
            </List.Item>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <Blockquote mb="md" mt="md">
              {children}
            </Blockquote>
          ),
          
          // Horizontal rules
          hr: () => <Divider my="xl" />,
          
          // Strong/Bold
          strong: ({ children }) => (
            <Text component="strong" fw={700} style={{ display: 'inline' }}>
              {children}
            </Text>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <Text component="em" fs="italic" style={{ display: 'inline' }}>
              {children}
            </Text>
          ),
          
          // Tables
          table: ({ children }) => (
            <Paper withBorder mb="md" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {children}
              </table>
            </Paper>
          ),
          th: ({ children }) => (
            <th style={{ 
              padding: '12px', 
              background: 'var(--mantine-color-gray-0)',
              borderBottom: '1px solid var(--mantine-color-gray-3)',
              textAlign: 'left',
              fontWeight: 600,
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ 
              padding: '12px', 
              borderBottom: '1px solid var(--mantine-color-gray-2)',
            }}>
              {children}
            </td>
          ),
        }}
      >
        {preprocessedContent}
      </ReactMarkdown>
    </div>
  );
}