import { useState, useEffect, useCallback } from 'react';
import type { DialogueEntry } from '../types';

interface DialoguePanelProps {
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
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/[（(]([^）)]+)[）)]/g, '<span style="color:#8a8070;font-style:italic">（$1）</span>');
}

export default function DialoguePanel({ entries, isNpcThinking, thinkingText }: DialoguePanelProps) {
  const [viewIndex, setViewIndex] = useState(entries.length - 1);

  useEffect(() => {
    setViewIndex(entries.length - 1);
  }, [entries.length]);

  const goNext = useCallback(() => {
    setViewIndex((i) => Math.min(i + 1, entries.length - 1));
  }, [entries.length]);

  const goPrev = useCallback(() => {
    setViewIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (entries.length === 0 && !isNpcThinking) return null;

  if (isNpcThinking && thinkingText) {
    return (
      <div className="document-panel rounded-lg px-6 py-5 mx-4 mb-4 max-w-2xl w-full self-center">
        <p className="font-game italic text-sm text-center" style={{ color: '#8a8070' }}>
          {thinkingText}<span className="thinking-dots" />
        </p>
      </div>
    );
  }

  const entry = entries[viewIndex];
  if (!entry) return null;

  const isNarrator = entry.type === 'narrator' || entry.type === 'scene_action';

  if (isNarrator) {
    return (
      <div
        className="relative px-6 py-8 mx-4 mb-4 max-w-2xl w-full self-center cursor-pointer"
        onClick={goNext}
      >
        {/* 朱砂印章装饰 */}
        <div className="seal-mark absolute" style={{ top: 8, right: 12 }} />
        <div className="ink-divider w-20 mx-auto mb-4" />
        <p
          className="font-game text-base leading-relaxed whitespace-pre-line text-center"
          style={{ color: '#c0b8a0' }}
          dangerouslySetInnerHTML={{ __html: renderContent(entry.content) }}
        />
        <div className="ink-divider w-20 mx-auto mt-4" />
        {entries.length > 1 && (
          <p className="text-center text-xs mt-3" style={{ color: '#4a4a50' }}>
            {viewIndex + 1} / {entries.length}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="document-panel rounded-lg px-6 py-5 mx-4 mb-4 max-w-2xl w-full self-center cursor-pointer"
      onClick={goNext}
    >
      <div className="flex items-baseline justify-between mb-3">
        {entry.speakerName ? (
          <span
            className="font-game text-sm font-semibold"
            style={{ color: entry.color || '#c9a84c', letterSpacing: '0.1em' }}
          >
            {entry.speakerName}
          </span>
        ) : (
          entry.type === 'player' && (
            <span
              className="font-game text-sm font-semibold"
              style={{ color: '#c9a84c', letterSpacing: '0.1em' }}
            >
              李世民
            </span>
          )
        )}
        {entries.length > 1 && (
          <span className="text-xs" style={{ color: '#4a4a50' }}>
            {viewIndex + 1} / {entries.length}
          </span>
        )}
      </div>

      <p
        className="font-game leading-relaxed whitespace-pre-line"
        style={{ color: '#e8e0d0', fontSize: '1.05rem' }}
        dangerouslySetInnerHTML={{ __html: renderContent(entry.content) }}
      />

      <div className="text-center mt-3">
        <span style={{ color: '#4a4a50', fontSize: '0.75rem' }}>▼</span>
      </div>
    </div>
  );
}
