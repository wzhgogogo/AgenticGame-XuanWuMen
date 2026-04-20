import SceneBackground from './SceneBackground';

interface TransitionScreenProps {
  endingText: string;
  transitionText: string;
  onContinue: () => void;
}

export default function TransitionScreen({ endingText, transitionText, onContinue }: TransitionScreenProps) {
  return (
    <div className="h-screen relative flex flex-col items-center justify-center px-4">
      <SceneBackground />

      <div className="relative z-10 max-w-[560px] w-full space-y-8">
        {/* 上一场景结局 */}
        <div className="stagger-1">
          <p
            className="font-game leading-relaxed whitespace-pre-line text-center"
            style={{ color: '#e8e0d0' }}
          >
            {endingText}
          </p>
        </div>

        {/* 金色分隔线 */}
        <div className="flex justify-center stagger-2">
          <div
            className="w-24 h-px"
            style={{ background: 'linear-gradient(to right, transparent, #c9a84c, transparent)' }}
          />
        </div>

        {/* 过场叙事 */}
        <div className="stagger-3">
          <p
            className="font-game italic leading-relaxed whitespace-pre-line text-center"
            style={{ color: '#8a8070' }}
          >
            {transitionText}
          </p>
        </div>

        {/* 继续按钮 */}
        <div className="flex justify-center mt-12 stagger-4">
          <button
            onClick={onContinue}
            className="px-10 py-3 rounded text-sm font-ui cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: '#e8e0d0',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.7)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.4)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
}
