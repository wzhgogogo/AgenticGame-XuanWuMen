interface TransitionScreenProps {
  endingText: string;
  transitionText: string;
  onContinue: () => void;
}

export default function TransitionScreen({ endingText, transitionText, onContinue }: TransitionScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-[560px] w-full animate-fade-in space-y-8">
        {/* 上一场景结局 */}
        <div>
          <p
            className="font-game leading-relaxed whitespace-pre-line text-center"
            style={{ color: '#e8e0d0' }}
          >
            {endingText}
          </p>
        </div>

        {/* 分隔线 */}
        <div className="flex justify-center">
          <div className="w-24 h-px" style={{ backgroundColor: '#2a2a34' }} />
        </div>

        {/* 过场叙事 */}
        <div>
          <p
            className="font-game italic leading-relaxed whitespace-pre-line text-center"
            style={{ color: '#8a8070' }}
          >
            {transitionText}
          </p>
        </div>

        {/* 继续按钮 */}
        <div className="flex justify-center mt-12">
          <button
            onClick={onContinue}
            className="px-8 py-3 rounded-sm text-sm font-ui cursor-pointer transition-colors"
            style={{ backgroundColor: '#2a2a34', color: '#e8e0d0' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
}
