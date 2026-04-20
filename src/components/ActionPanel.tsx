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
    <div className="glass-panel rounded-lg mx-4 mb-4 px-5 py-4 max-w-2xl w-full self-center">
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
                backgroundColor: 'rgba(20, 20, 30, 0.6)',
                border: '1px solid rgba(201, 168, 76, 0.2)',
                color: '#e8e0d0',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.5)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.backgroundColor = 'rgba(30, 28, 40, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'rgba(20, 20, 30, 0.6)';
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
          className="flex-1 px-3 py-2 rounded text-sm outline-none disabled:opacity-40"
          style={{
            backgroundColor: 'rgba(20, 20, 30, 0.4)',
            border: '1px solid rgba(201, 168, 76, 0.1)',
            color: '#c0b8a0',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.3)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.1)'; }}
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
