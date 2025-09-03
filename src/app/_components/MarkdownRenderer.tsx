'use client';

import React, { useMemo } from 'react';
import { Text, Code, Title, List, Blockquote, Divider, Anchor } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

interface MarkdownRendererProps {
  content: string;
}

interface MarkdownNode {
  type: string;
  content?: string;
  children?: MarkdownNode[];
  level?: number;
  href?: string;
  language?: string;
  ordered?: boolean;
}

// Simple markdown parser for the most common elements
function parseMarkdown(markdown: string): MarkdownNode[] {
  const lines = markdown.split('\n');
  const nodes: MarkdownNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line?.trim()) {
      i++;
      continue;
    }
    
    // Headers
    const headerMatch = /^(#{1,6})\s+(.+)$/.exec(line ?? '');
    if (headerMatch) {
      nodes.push({
        type: 'heading',
        level: headerMatch[1]?.length ?? 1,
        content: headerMatch[2] ?? '',
      });
      i++;
      continue;
    }
    
    // Code blocks
    if (line?.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i]?.startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      
      nodes.push({
        type: 'codeblock',
        content: codeLines.join('\n'),
        language: language || 'text',
      });
      i++; // Skip closing ```
      continue;
    }
    
    // Lists
    const listMatch = /^(\s*)[-*+]\s+(.+)$/.exec(line ?? '');
    const orderedListMatch = /^(\s*)\d+\.\s+(.+)$/.exec(line ?? '');
    
    if (listMatch || orderedListMatch) {
      const isOrdered = !!orderedListMatch;
      const listItems: string[] = [];
      
      while (i < lines.length) {
        const currentLine = lines[i];
        const currentListMatch = currentLine?.match(/^(\s*)[-*+]\s+(.+)$/);
        const currentOrderedMatch = currentLine?.match(/^(\s*)\d+\.\s+(.+)$/);
        
        if ((!isOrdered && currentListMatch) || (isOrdered && currentOrderedMatch)) {
          const match = isOrdered ? currentOrderedMatch : currentListMatch;
          listItems.push(match?.[2] ?? '');
          i++;
        } else {
          break;
        }
      }
      
      nodes.push({
        type: 'list',
        ordered: isOrdered,
        children: listItems.map(item => ({ type: 'listitem', content: item })),
      });
      continue;
    }
    
    // Blockquotes
    if (line?.startsWith('>')) {
      const quoteLines: string[] = [];
      
      while (i < lines.length && lines[i]?.startsWith('>')) {
        quoteLines.push(lines[i]?.slice(1).trim() ?? '');
        i++;
      }
      
      nodes.push({
        type: 'blockquote',
        content: quoteLines.join(' '),
      });
      continue;
    }
    
    // Horizontal rules
    if (/^[-*_]{3,}$/.exec(line ?? '')) {
      nodes.push({ type: 'hr' });
      i++;
      continue;
    }
    
    // Regular paragraphs
    const paragraphLines: string[] = [];
    
    while (i < lines.length && lines[i]?.trim() && 
           !lines[i]?.startsWith('#') && 
           !lines[i]?.startsWith('```') &&
           !lines[i]?.match(/^(\s*)[-*+]\s/) &&
           !lines[i]?.match(/^(\s*)\d+\.\s/) &&
           !lines[i]?.startsWith('>') &&
           !lines[i]?.match(/^[-*_]{3,}$/)) {
      paragraphLines.push(lines[i] ?? '');
      i++;
    }
    
    if (paragraphLines.length > 0) {
      nodes.push({
        type: 'paragraph',
        content: paragraphLines.join(' '),
      });
    }
  }
  
  return nodes;
}

// Simple inline markdown processing without regex loops
function processInlineMarkdown(text: string): React.ReactElement {
  // For now, return plain text to avoid the repetition bug
  // TODO: Implement proper markdown parsing library
  return <span>{text}</span>;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const nodes = useMemo(() => parseMarkdown(content), [content]);
  
  return (
    <div style={{ lineHeight: 1.6 }}>
      {nodes.map((node, index) => {
        switch (node.type) {
          case 'heading':
            const HeadingComponent = node.level === 1 ? Title : 
                                   node.level === 2 ? Title : 
                                   Title;
            const order = node.level as 1 | 2 | 3 | 4 | 5 | 6;
            
            return (
              <HeadingComponent
                key={index}
                order={order}
                mb="md"
                mt={index > 0 ? "xl" : 0}
              >
                {node.content}
              </HeadingComponent>
            );
            
          case 'paragraph':
            return (
              <Text key={index} mb="md" size="md">
                {processInlineMarkdown(node.content!)}
              </Text>
            );
            
          case 'codeblock':
            return (
              <Code
                key={index}
                block
                mb="md"
                p="md"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                  lineHeight: 1.4,
                }}
              >
                {node.content}
              </Code>
            );
            
          case 'list':
            return (
              <List
                key={index}
                mb="md"
                type={node.ordered ? "ordered" : "unordered"}
              >
                {node.children?.map((item, itemIndex) => (
                  <List.Item key={itemIndex}>
                    {processInlineMarkdown(item.content!)}
                  </List.Item>
                ))}
              </List>
            );
            
          case 'blockquote':
            return (
              <Blockquote key={index} mb="md">
                {processInlineMarkdown(node.content!)}
              </Blockquote>
            );
            
          case 'hr':
            return <Divider key={index} my="xl" />;
            
          default:
            return null;
        }
      })}
    </div>
  );
}