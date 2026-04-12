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
    <div
      className="px-4 py-3"
      style={{
        backgroundColor: '#0e0e16',
        borderTop: '1px solid #1a1a24',
      }}
    >
      <div className="max-w-[640px] mx-auto space-y-3">
        {/* 预设选项 */}
        {suggestedActions.length > 0 && (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {suggestedActions.map((action) => (
              <button
                key={action}
                onClick={() => !disabled && onSubmit(action)}
                disabled={disabled}
                className="shrink-0 px-3 py-1.5 rounded text-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#1a1a24',
                  border: '1px solid #2a2a34',
                  color: '#e8e0d0',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) (e.currentTarget.style.borderColor = '#3a3a44');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a2a34';
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
            className="flex-1 px-3 py-2 rounded-sm text-sm outline-none transition-colors disabled:opacity-40"
            style={{
              backgroundColor: '#1a1a24',
              border: '1px solid #2a2a34',
              color: '#e8e0d0',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3a3a44'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a34'; }}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="px-4 py-2 rounded-sm text-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: input.trim() && !disabled ? '#2a2a34' : '#1a1a24',
              color: input.trim() && !disabled ? '#e8e0d0' : '#8a8070',
              border: '1px solid #2a2a34',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
