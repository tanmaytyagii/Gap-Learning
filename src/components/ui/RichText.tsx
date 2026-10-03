import { Fragment, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Renders the small Markdown subset produced by the AI endpoints (### headings, "-" and "1."
 * lists, **bold**, *italic*, `code`, and $math$) as React elements. Text is never injected as
 * HTML, so model output cannot run script or change the page structure.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\$[^$]+\$)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('$') && part.endsWith('$')) return <span key={index} className="font-medium text-fg">{part.slice(1, -1)}</span>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  markdown.replace(/\r\n/g, '\n').split('\n').forEach((raw) => {
    const line = raw.trim();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (!line) return flush();
    if (heading) {
      flush();
      blocks.push({ type: 'heading', text: heading[1] });
      return;
    }
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const last = blocks[blocks.length - 1];
      const text = (bullet ?? numbered)![1];
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(text);
      else blocks.push({ type: 'list', ordered, items: [text] });
      return;
    }
    paragraph.push(line);
  });
  flush();
  return blocks;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-3 text-sm leading-6 text-fg-2', className)}>
      {parse(text).map((block, index) => {
        if (block.type === 'heading') return <h3 key={index} className="pt-1 text-sm font-semibold text-fg">{inline(block.text)}</h3>;
        if (block.type === 'paragraph') return <p key={index}>{inline(block.text)}</p>;
        const List = block.ordered ? 'ol' : 'ul';
        return (
          <List key={index} className={cn('space-y-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
            {block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}
          </List>
        );
      })}
    </div>
  );
}
