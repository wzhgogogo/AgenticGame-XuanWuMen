import type { EndingType } from '../types/world';
import SceneBackground from './SceneBackground';

interface EndingScreenProps {
  endingType: EndingType;
  onRestart: () => void;
}

const ENDING_DATA: Record<EndingType, { title: string; text: string }> = {
  coup_success: {
    title: '玄武门之变',
    text: '六月初四，玄武门下，鲜血染红了青石板。\n\n太子建成、齐王元吉伏诛。秦王世民终于扫清了通往皇位的最后障碍。\n\n两月后，李渊禅位，秦王登基，是为唐太宗。\n贞观之治，由此开启。',
  },
  coup_fail_captured: {
    title: '兵败身死',
    text: '兵变仓促发动，准备不足，大势已去。\n\n秦王府精兵溃散，世民被擒于玄武门下。建成与元吉联名上表，请诛逆王。\n\n李渊老泪纵横，终究下了那道诏书。\n天策上将，陨落长安。',
  },
  coup_fail_civil_war_win: {
    title: '内战登基',
    text: '玄武门一役，功亏一篑。秦王负伤退走，率残部退守洛阳。\n\n然而秦王府的底蕴犹在。经过数月鏖战，各地旧部纷纷响应。建成的朝廷在内忧外患中土崩瓦解。\n\n世民最终入主长安，但大唐已是满目疮痍。\n这个皇位，是用整个天下的血换来的。',
  },
  deposed: {
    title: '削爵流放',
    text: '秦王终究没有迈出那一步。\n\n建成步步紧逼，元吉落井下石。朝臣倒戈，天子猜疑日深。\n\n一道圣旨，秦王被削去天策上将之号，贬为庶人，流放巴蜀。\n长安城的风，再也吹不到他的脸上了。',
  },
  peace: {
    title: '兄弟和衷',
    text: '这是最不可能发生的事。\n\n或许是秦王的隐忍感化了建成，或许是李渊终于做出了公正的裁决。兄弟三人在太极殿前握手言和，各守其分。\n\n没有玄武门的血，没有兄弟阋墙的悲剧。\n但历史的车轮，是否真的能被一个人的善意改变？\n\n这个答案，只有你知道。',
  },
};

export default function EndingScreen({ endingType, onRestart }: EndingScreenProps) {
  const ending = ENDING_DATA[endingType];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`【${ending.title}】\n\n${ending.text}`);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="h-screen relative flex flex-col items-center justify-center px-4">
      <SceneBackground phaseIndex={2} />

      <div className="relative z-10 max-w-[560px] w-full">
        {/* 金色分隔线 */}
        <div
          className="w-24 h-px mx-auto mb-8 stagger-1"
          style={{ background: 'linear-gradient(to right, transparent, #c9a84c, transparent)' }}
        />

        <h2
          className="font-calligraphy text-2xl mb-8 text-center stagger-2"
          style={{
            color: '#e8e0d0',
            textShadow: '0 0 30px rgba(201, 168, 76, 0.3)',
          }}
        >
          {ending.title}
        </h2>

        <p
          className="font-game text-sm leading-loose whitespace-pre-line stagger-3"
          style={{ color: '#c0b8a0', borderLeft: '2px solid rgba(199, 62, 58, 0.15)', paddingLeft: '1rem' }}
        >
          {ending.text}
        </p>

        <div
          className="w-24 h-px mx-auto mt-8 stagger-3"
          style={{ background: 'linear-gradient(to right, transparent, #c9a84c, transparent)' }}
        />

        <div className="flex items-center justify-center gap-4 mt-10 stagger-4">
          <button
            onClick={onRestart}
            className="px-8 py-2.5 rounded text-sm font-ui cursor-pointer"
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
            再来一局
          </button>
          <button
            onClick={handleCopy}
            className="px-8 py-2.5 rounded text-sm font-ui cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: '#8a8070',
              border: '1px solid rgba(201, 168, 76, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.4)';
              e.currentTarget.style.color = '#c0b8a0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.15)';
              e.currentTarget.style.color = '#8a8070';
            }}
          >
            复制结局
          </button>
        </div>
      </div>
    </div>
  );
}
