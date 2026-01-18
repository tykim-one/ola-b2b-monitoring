'use client';

import React, { useMemo, useState, useCallback } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  /** Size variant: 'sm' for chat bubbles, 'base' for content areas */
  size?: 'sm' | 'base';
  /** Whether to show copy button on code blocks */
  enableCodeCopy?: boolean;
}

const sizeClasses = {
  sm: {
    h1: 'text-lg font-bold mt-3 mb-1.5 text-slate-100',
    h2: 'text-base font-bold mt-2.5 mb-1 text-slate-100',
    h3: 'text-sm font-semibold mt-2 mb-1 text-slate-100',
    h4: 'text-sm font-semibold mt-2 mb-0.5 text-slate-200',
    p: 'mb-2 text-slate-200',
    ul: 'list-disc ml-4 mb-2 text-slate-200',
    ol: 'list-decimal ml-4 mb-2 text-slate-200',
    li: 'mb-0.5',
    blockquote: 'border-l-4 border-slate-600 pl-3 my-2 italic text-slate-400',
    pre: 'bg-slate-900/60 rounded-md p-2.5 my-2 overflow-x-auto text-xs',
    table: 'text-xs',
    th: 'px-2 py-1.5',
    td: 'px-2 py-1.5',
  },
  base: {
    h1: 'text-2xl font-bold mt-5 mb-2 text-slate-100',
    h2: 'text-xl font-bold mt-4 mb-2 text-slate-100',
    h3: 'text-lg font-semibold mt-3 mb-1.5 text-slate-100',
    h4: 'text-base font-semibold mt-3 mb-1 text-slate-200',
    p: 'mb-3 text-slate-200',
    ul: 'list-disc ml-5 mb-3 text-slate-200',
    ol: 'list-decimal ml-5 mb-3 text-slate-200',
    li: 'mb-1',
    blockquote: 'border-l-4 border-slate-600 pl-4 my-3 italic text-slate-400',
    pre: 'bg-slate-900/60 rounded-md p-3 my-3 overflow-x-auto text-sm',
    table: 'text-sm',
    th: 'px-3 py-2',
    td: 'px-3 py-2',
  },
} as const;

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-all ${className}`}
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function MarkdownViewer({
  content,
  className = '',
  size = 'base',
  enableCodeCopy = true,
}: MarkdownViewerProps) {
  const styles = sizeClasses[size];

  const components: Components = useMemo(() => ({
    h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
    h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
    h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
    h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
    p: ({ children }) => <p className={styles.p}>{children}</p>,
    ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
    ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
    li: ({ children }) => <li className={styles.li}>{children}</li>,
    blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,

    a: ({ href, children }) => {
      const isExternal = href?.startsWith('http');
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-0.5"
        >
          {children}
          {isExternal && <ExternalLink className="w-3 h-3 ml-0.5" />}
        </a>
      );
    },

    code: ({ className: codeClassName, children, ...props }) => {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const isBlock = match !== null;

      if (!isBlock) {
        return (
          <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-blue-300 text-[0.9em]" {...props}>
            {children}
          </code>
        );
      }

      return (
        <code className={`${codeClassName} text-slate-300`} {...props}>
          {children}
        </code>
      );
    },

    pre: ({ children }) => {
      // Extract text content for copy button
      let codeContent = '';
      if (React.isValidElement(children)) {
        const childProps = children.props as { children?: React.ReactNode };
        if (typeof childProps.children === 'string') {
          codeContent = childProps.children;
        } else if (Array.isArray(childProps.children)) {
          codeContent = childProps.children.join('');
        }
      }

      return (
        <div className="relative group">
          <pre className={styles.pre}>
            {children}
          </pre>
          {enableCodeCopy && codeContent && (
            <CopyButton
              text={codeContent}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
            />
          )}
        </div>
      );
    },

    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className={`border-collapse border border-slate-700 w-full ${styles.table}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
    th: ({ children }) => (
      <th className={`border border-slate-700 font-semibold text-left text-slate-200 ${styles.th}`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`border border-slate-700 text-slate-300 ${styles.td}`}>
        {children}
      </td>
    ),

    hr: () => <hr className="border-slate-700 my-4" />,

    strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="line-through text-slate-400">{children}</del>,

    // GFM task list items
    input: ({ checked }) => (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mr-2 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
      />
    ),
  }), [styles, enableCodeCopy]);

  return (
    <div className={`markdown-viewer leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
