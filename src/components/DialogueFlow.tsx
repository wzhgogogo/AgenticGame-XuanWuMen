import { useEffect, useRef } from 'react';
import type { DialogueEntry } from '../types';

interface DialogueFlowProps {
  entries: DialogueEntry[];
  isNpcThinking: boolean;
  thinkingText?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderContent(text: string): string {
  // 先转义 HTML，再做 markdown 格式化，防止 LLM 输出注入
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function NarratorEntry({ entry }: { entry: DialogueEntry }) {
  return (
    <div className="text-center py-3 px-4">
      <p
        className="font-game italic whitespace-pre-line leading-relaxed"
        style={{ color: '#8a8070' }}
        dangerouslySetInnerHTML={{ __html: renderContent(entry.content) }}
      />
    </div>
  );
}

function NpcEntry({ entry }: { entry: DialogueEntry }) {
  return (
    <div className="py-2 px-4">
      <div
        className="pl-3"
        style={{ borderLeft: `2px solid ${entry.color || '#8a8070'}30` }}
      >
        {entry.speakerName && (
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: entry.color || '#8a8070' }}
          >
            {entry.speakerName}
          </p>
        )}
        <p
          className="leading-relaxed"
          style={{ color: '#e8e0d0' }}
          dangerouslySetInnerHTML={{ __html: renderContent(entry.content) }}
        />
      </div>
    </div>
  );
}

function PlayerEntry({ entry }: { entry: DialogueEntry }) {
  return (
    <div className="py-2 px-4 flex justify-end">
      <div
        className="max-w-[80%] px-4 py-2.5 rounded"
        style={{ backgroundColor: '#1a1a24', color: '#e8e0d0' }}
      >
        <p className="leading-relaxed">{entry.content}</p>
      </div>
    </div>
  );
}

function SceneActionEntry({ entry }: { entry: DialogueEntry }) {
  return (
    <div className="text-center py-2 px-4">
      <p className="text-sm italic" style={{ color: '#8a8070' }}>
        {entry.content}
      </p>
    </div>
  );
}

export default function DialogueFlow({ entries, isNpcThinking, thinkingText }: DialogueFlowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Only scroll when entries count changes (not on every streaming content update)
  const entryCount = entries.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entryCount]);

  return (
    <div className="flex-1 overflow-y-auto dialogue-scroll">
      <div className="max-w-[640px] mx-auto py-4">
        {entries.map((entry) => {
          switch (entry.type) {
            case 'narrator':
              return <NarratorEntry key={entry.id} entry={entry} />;
            case 'npc':
              return <NpcEntry key={entry.id} entry={entry} />;
            case 'player':
              return <PlayerEntry key={entry.id} entry={entry} />;
            case 'scene_action':
              return <SceneActionEntry key={entry.id} entry={entry} />;
            default:
              return null;
          }
        })}

        {isNpcThinking && thinkingText && (
          <div className="text-center py-3 px-4">
            <p className="italic text-sm" style={{ color: '#8a8070' }}>
              {thinkingText}<span className="thinking-dots" />
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
