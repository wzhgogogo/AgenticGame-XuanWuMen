import { useState } from 'react';

interface ActionPanelProps {
  suggestedActions: string[];
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export default function ActionPanel({ suggestedActions, onSubmit, disabled }: ActionPanelProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (disabled) return;
    const text = input.trim();
    onSubmit(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="document-panel rounded-lg mx-4 mb-4 px-5 py-4 max-w-2xl w-full self-center">
      {/* 抉择卡片 */}
      {suggestedActions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {suggestedActions.map((action) => (
            <button
              key={action}
              onClick={() => !disabled && onSubmit(action)}
              disabled={disabled}
              className="text-left px-4 py-3 rounded text-sm font-game cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'rgba(25, 20, 15, 0.7)',
                border: '1px solid rgba(201, 168, 76, 0.1)',
                borderTop: '1px solid rgba(232, 224, 208, 0.06)',
                color: '#e8e0d0',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.backgroundColor = 'rgba(35, 28, 20, 0.85)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'rgba(25, 20, 15, 0.7)';
              }}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* 自由输入 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="以秦王的身份说……"
          className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-40"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
            borderRadius: 0,
            color: '#c0b8a0',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(201, 168, 76, 0.4)'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(201, 168, 76, 0.15)'; }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="px-4 py-2 rounded text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: input.trim() && !disabled ? 'rgba(201, 168, 76, 0.15)' : 'rgba(20, 20, 30, 0.4)',
            color: input.trim() && !disabled ? '#c9a84c' : '#4a4a50',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            transition: 'all 0.2s ease',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
