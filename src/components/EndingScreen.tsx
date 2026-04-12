interface EndingScreenProps {
  endingText: string;
  onRestart: () => void;
}

export default function EndingScreen({ endingText, onRestart }: EndingScreenProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(endingText);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-[560px] w-full animate-fade-in">
        <p
          className="font-game leading-relaxed whitespace-pre-line text-center"
          style={{ color: '#e8e0d0' }}
        >
          {endingText}
        </p>

        <div className="flex items-center justify-center gap-4 mt-12">
          <button
            onClick={onRestart}
            className="px-6 py-2.5 rounded-sm text-sm font-ui cursor-pointer transition-colors"
            style={{
              backgroundColor: '#2a2a34',
              color: '#e8e0d0',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
          >
            再来一局
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-2.5 rounded-sm text-sm font-ui cursor-pointer transition-colors"
            style={{
              backgroundColor: '#1a1a24',
              color: '#8a8070',
              border: '1px solid #2a2a34',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a3a44'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a34'; }}
          >
            复制结局
          </button>
        </div>
      </div>
    </div>
  );
}
